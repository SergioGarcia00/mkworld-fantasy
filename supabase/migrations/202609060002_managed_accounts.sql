-- Participation is operator-managed; spectators do not need accounts.
alter table public.profiles add column access_enabled boolean not null default false;
update public.profiles set access_enabled=true where role='ADMIN';
alter table public.leagues add column is_public boolean not null default false;

-- Only Auth administrators can set raw_app_meta_data; user metadata is untrusted.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if coalesce(new.raw_app_meta_data->>'managed_account','false') <> 'true' then
  raise exception 'El registro público está cerrado. La administración debe crear la cuenta.' using errcode='42501';
 end if;
 insert into public.profiles(id,display_name,access_enabled)
 values(new.id,left(coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'),''),'Participante'),80),true);
 return new;
end $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='ADMIN' and access_enabled);
$$;
create or replace function public.is_league_member(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.league_members m join public.profiles p on p.id=m.user_id
 where m.league_id=target and p.id=auth.uid() and p.access_enabled);
$$;
create function public.set_participant_access(target_user uuid, enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Solo administradores' using errcode='42501'; end if;
 update public.profiles set access_enabled=enabled where id=target_user and role='USER';
 if not found then raise exception 'Participante no encontrado'; end if;
end $$;
create function public.set_league_publication(target_league uuid, published boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Solo administradores' using errcode='42501'; end if;
 update public.leagues set is_public=published where id=target_league;
 if not found then raise exception 'Liga no encontrada'; end if;
end $$;
revoke all on function public.set_participant_access(uuid,boolean),public.set_league_publication(uuid,boolean) from public,anon;
grant execute on function public.set_participant_access(uuid,boolean),public.set_league_publication(uuid,boolean) to authenticated;

-- Narrow public projections. Base tables, invite codes and budgets remain private.
create function public.spectator_leagues() returns table(id uuid,name text,season_name text,participants bigint)
language sql stable security definer set search_path='' as $$
 select l.id,l.name,s.name,(select count(*) from public.fantasy_teams f where f.league_id=l.id)
 from public.leagues l join public.seasons s on s.id=l.season_id where l.is_public order by l.created_at desc,l.id;
$$;
create function public.spectator_matchdays(target_league uuid) returns table(id uuid,number integer,name text)
language sql stable security definer set search_path='' as $$
 select m.id,m.number,m.name from public.matchdays m join public.leagues l on l.season_id=m.season_id
 where l.id=target_league and l.is_public and m.status='FINISHED' order by m.number desc;
$$;
create function public.spectator_standings(target_league uuid, target_matchday uuid default null)
returns table("position" bigint,fantasy_team_id uuid,participant_name text,fantasy_team_name text,total_points numeric,last_matchday_points numeric)
language sql stable security definer set search_path='' as $$
 with totals as (
  select f.id,p.display_name,f.name,
   coalesce((select sum(sc.points) from public.fantasy_team_matchday_scores sc join public.matchdays m on m.id=sc.matchday_id
    where sc.fantasy_team_id=f.id and m.season_id=l.season_id and m.status='FINISHED'
    and (target_matchday is null or m.id=target_matchday)),0) points,
   coalesce((select sc.points from public.fantasy_team_matchday_scores sc where sc.fantasy_team_id=f.id and sc.matchday_id=(
    select m.id from public.matchdays m where m.season_id=l.season_id and m.status='FINISHED' order by m.number desc limit 1)),0) last_points
  from public.fantasy_teams f join public.leagues l on l.id=f.league_id join public.profiles p on p.id=f.user_id
  where l.id=target_league and l.is_public and (target_matchday is null or exists(
   select 1 from public.matchdays m where m.id=target_matchday and m.season_id=l.season_id and m.status='FINISHED'))
 )
 select rank() over(order by points desc),id,display_name,name,points,last_points from totals order by points desc,name,id;
$$;
revoke all on function public.spectator_leagues(),public.spectator_matchdays(uuid),public.spectator_standings(uuid,uuid) from public;
grant execute on function public.spectator_leagues(),public.spectator_matchdays(uuid),public.spectator_standings(uuid,uuid) to anon,authenticated;

create function public.admin_create_league(league_name text,target_season uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare created_id uuid; config public.app_config;
begin
 if not public.is_admin() then raise exception 'Solo administradores' using errcode='42501'; end if;
 if length(btrim(league_name)) not between 1 and 80 then raise exception 'Nombre inválido'; end if;
 select * into strict config from public.app_config where id=true;
 insert into public.leagues(season_id,name,owner_id,invite_code,starting_budget,squad_size,starter_size,max_players_same_real_team,captain_multiplier)
 values(target_season,btrim(league_name),auth.uid(),gen_random_uuid()::text,config.starting_budget,config.squad_size,config.starter_size,config.max_players_same_real_team,config.captain_multiplier)
 returning id into created_id;
 return created_id;
end $$;
create function public.admin_enroll_participant(target_league uuid,target_user uuid,team_name text) returns void
language plpgsql security definer set search_path='' as $$
declare league public.leagues;
begin
 if not public.is_admin() then raise exception 'Solo administradores' using errcode='42501'; end if;
 if length(btrim(team_name)) not between 1 and 80 then raise exception 'Nombre de equipo inválido'; end if;
 if not exists(select 1 from public.profiles where id=target_user and role='USER' and access_enabled) then raise exception 'Participante no autorizado'; end if;
 select * into strict league from public.leagues where id=target_league for update;
 if exists(select 1 from public.fantasy_teams where league_id=target_league and user_id=target_user) then return; end if;
 if league.max_members is not null and (select count(*) from public.league_members where league_id=target_league)>=league.max_members then raise exception 'La liga está completa'; end if;
 insert into public.league_members(league_id,user_id) values(target_league,target_user) on conflict do nothing;
 insert into public.fantasy_teams(league_id,user_id,name,budget) values(target_league,target_user,btrim(team_name),league.starting_budget);
end $$;
revoke all on function public.admin_create_league(text,uuid),public.admin_enroll_participant(uuid,uuid,text) from public,anon;
grant execute on function public.admin_create_league(text,uuid),public.admin_enroll_participant(uuid,uuid,text) to authenticated;
