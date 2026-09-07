-- MKWorld Fantasy has one official league. Existing data is preserved, but only
-- the configured official league can be used or published by the application.
alter table public.app_config add column official_league_id uuid unique references public.leagues(id) on delete restrict;
update public.app_config set official_league_id=(select id from public.leagues order by created_at,id limit 1) where id=true and official_league_id is null;
update public.leagues set is_public=false where id<>(select official_league_id from public.app_config where id=true) or (select official_league_id from public.app_config where id=true) is null;

create function public.enforce_single_official_league() returns trigger language plpgsql security definer set search_path='' as $$
declare configured uuid;
begin
 select official_league_id into configured from public.app_config where id=true for update;
 if configured is not null then raise exception 'Solo puede existir una liga oficial'; end if;
 return new;
end $$;
create trigger only_one_league before insert on public.leagues for each row execute function public.enforce_single_official_league();

create or replace function public.official_league() returns table(id uuid,name text,season_name text,participants bigint,is_public boolean)
language sql stable security definer set search_path='' as $$
 select l.id,l.name,s.name,(select count(*) from public.fantasy_teams f where f.league_id=l.id),l.is_public
 from public.app_config c join public.leagues l on l.id=c.official_league_id join public.seasons s on s.id=l.season_id where c.id=true;
$$;
create or replace function public.spectator_leagues() returns table(id uuid,name text,season_name text,participants bigint)
language sql stable security definer set search_path='' as $$ select id,name,season_name,participants from public.official_league() where is_public; $$;
drop function public.spectator_matchdays(uuid);
create function public.spectator_matchdays() returns table(id uuid,number integer,name text)
language sql stable security definer set search_path='' as $$
 select m.id,m.number,m.name from public.matchdays m join public.official_league() o on true join public.leagues l on l.id=o.id
 where l.season_id=m.season_id and o.is_public and m.status='FINISHED' order by m.number desc;
$$;
drop function public.spectator_standings(uuid,uuid);
create function public.spectator_standings(target_matchday uuid default null)
returns table("position" bigint,fantasy_team_id uuid,participant_name text,fantasy_team_name text,total_points numeric,last_matchday_points numeric)
language sql stable security definer set search_path='' as $$
 with official as (select l.id,l.season_id,l.is_public from public.app_config c join public.leagues l on l.id=c.official_league_id where c.id=true), totals as (
  select f.id,p.display_name,f.name,
   coalesce((select sum(sc.points) from public.fantasy_team_matchday_scores sc join public.matchdays m on m.id=sc.matchday_id where sc.fantasy_team_id=f.id and m.season_id=o.season_id and m.status='FINISHED' and (target_matchday is null or m.id=target_matchday)),0) points,
   coalesce((select sc.points from public.fantasy_team_matchday_scores sc where sc.fantasy_team_id=f.id and sc.matchday_id=(select m.id from public.matchdays m where m.season_id=o.season_id and m.status='FINISHED' order by m.number desc limit 1)),0) last_points
  from public.fantasy_teams f join official o on o.id=f.league_id join public.profiles p on p.id=f.user_id
  where o.is_public and (target_matchday is null or exists(select 1 from public.matchdays m where m.id=target_matchday and m.season_id=o.season_id and m.status='FINISHED'))
 ) select rank() over(order by points desc),id,display_name,name,points,last_points from totals order by points desc,name,id;
$$;
create or replace function public.set_league_publication(target_league uuid, published boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Solo administradores' using errcode='42501'; end if;
 if target_league<>(select official_league_id from public.app_config where id=true) then raise exception 'Solo existe la liga oficial'; end if;
 update public.leagues set is_public=published where id=target_league;
end $$;
drop function public.admin_create_league(text,uuid);
create function public.initialize_official_league(league_name text,target_season uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare created_id uuid; config public.app_config;
begin
 if not public.is_admin() then raise exception 'Solo administradores' using errcode='42501'; end if;
 if (select official_league_id from public.app_config where id=true) is not null then raise exception 'La liga oficial ya está configurada'; end if;
 if length(btrim(league_name)) not between 1 and 80 then raise exception 'Nombre inválido'; end if;
 select * into strict config from public.app_config where id=true;
 insert into public.leagues(season_id,name,owner_id,invite_code,starting_budget,squad_size,starter_size,max_players_same_real_team,captain_multiplier) values(target_season,btrim(league_name),auth.uid(),gen_random_uuid()::text,config.starting_budget,config.squad_size,config.starter_size,config.max_players_same_real_team,config.captain_multiplier) returning id into created_id;
 update public.app_config set official_league_id=created_id where id=true;
 return created_id;
end $$;
drop function public.admin_enroll_participant(uuid,uuid,text);
create function public.enroll_official_participant(target_user uuid,team_name text) returns void
language plpgsql security definer set search_path='' as $$
declare league public.leagues;
begin
 if not public.is_admin() then raise exception 'Solo administradores' using errcode='42501'; end if;
 if length(btrim(team_name)) not between 1 and 80 then raise exception 'Nombre de equipo inválido'; end if;
 if not exists(select 1 from public.profiles where id=target_user and role='USER' and access_enabled) then raise exception 'Participante no autorizado'; end if;
 select l.* into strict league from public.leagues l join public.app_config c on c.official_league_id=l.id where c.id=true for update;
 if exists(select 1 from public.fantasy_teams where league_id=league.id and user_id=target_user) then return; end if;
 if league.max_members is not null and (select count(*) from public.league_members where league_id=league.id)>=league.max_members then raise exception 'La liga está completa'; end if;
 insert into public.league_members(league_id,user_id) values(league.id,target_user) on conflict do nothing;
 insert into public.fantasy_teams(league_id,user_id,name,budget) values(league.id,target_user,btrim(team_name),league.starting_budget);
end $$;
revoke all on function public.initialize_official_league(text,uuid),public.enroll_official_participant(uuid,text),public.official_league(),public.spectator_leagues(),public.spectator_matchdays(),public.spectator_standings(uuid) from public,anon;
grant execute on function public.initialize_official_league(text,uuid),public.enroll_official_participant(uuid,text) to authenticated;
grant execute on function public.official_league(),public.spectator_leagues(),public.spectator_matchdays(),public.spectator_standings(uuid) to anon,authenticated;
