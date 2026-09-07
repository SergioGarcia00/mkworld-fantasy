-- Phase 1 foundation. Future fantasy tables are intentionally read-only to clients.
create type public.user_role as enum ('USER','ADMIN');
create type public.player_status as enum ('ACTIVE','INACTIVE','SUSPENDED');
create type public.matchday_status as enum ('UPCOMING','OPEN','LOCKED','FINISHED');
create type public.match_status as enum ('SCHEDULED','LIVE','FINISHED');
create type public.transaction_type as enum ('BUY','SELL','BID','TRANSFER','ADMIN');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (length(display_name) between 1 and 80),
 role public.user_role not null default 'USER', created_at timestamptz not null default now()
);
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,left(coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'),''),'Piloto'),80));
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id = auth.uid() and role = 'ADMIN');
$$;

create table public.seasons (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
 starts_at timestamptz, ends_at timestamptz, created_at timestamptz not null default now(),
 check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create table public.app_config (
 id boolean primary key default true check (id), starting_budget bigint not null default 100000000 check (starting_budget >= 0),
 initial_player_value bigint not null default 10000000 check (initial_player_value >= 0),
 squad_size integer not null default 6 check (squad_size > 0), starter_size integer not null default 4 check (starter_size > 0 and starter_size <= squad_size),
 max_players_same_real_team integer not null default 2 check (max_players_same_real_team > 0),
 captain_multiplier numeric(5,2) not null default 1.5 check (captain_multiplier >= 1)
);
insert into public.app_config(id) values (true);
create table public.teams (
 id uuid primary key default gen_random_uuid(), source_key text not null unique,
 name text not null check (length(name) between 1 and 120), tag text not null default '' check(length(tag)<=20), slug text not null unique,
 logo_url text, color text check(color is null or color ~ '^#[0-9a-fA-F]{6}$'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.team_seasons (
 team_id uuid references public.teams(id), season_id uuid references public.seasons(id),
 wins integer not null default 0 check(wins>=0), losses integer not null default 0 check(losses>=0), points numeric not null default 0,
 primary key(team_id,season_id)
);
create table public.players (
 id uuid primary key default gen_random_uuid(), source_key text not null unique,
 name text not null check (length(name) between 1 and 120), slug text not null unique,
 team_id uuid not null references public.teams(id), nationality text, avatar_url text,
 mkcentral_player_id text unique, market_value bigint not null check (market_value >= 0), initial_value bigint not null check(initial_value>=0),
 status public.player_status not null default 'ACTIVE',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index players_team_idx on public.players(team_id);
create table public.player_seasons (
 player_id uuid references public.players(id), season_id uuid references public.seasons(id), team_id uuid not null references public.teams(id),
 primary key(player_id,season_id)
);
create table public.scoring_rules (
 id uuid primary key default gen_random_uuid(), season_id uuid not null references public.seasons(id),
 version integer not null check(version>0), rules jsonb not null check(jsonb_typeof(rules)='object'), created_at timestamptz not null default now(), unique(season_id,version)
);
create table public.leagues (
 id uuid primary key default gen_random_uuid(), season_id uuid not null references public.seasons(id),
 name text not null check(length(name) between 1 and 80), owner_id uuid not null references public.profiles(id), invite_code text not null unique,
 max_members integer check(max_members>0), starting_budget bigint not null check(starting_budget>=0),
 squad_size integer not null check(squad_size>0), starter_size integer not null check(starter_size>0 and starter_size<=squad_size),
 max_players_same_real_team integer not null check(max_players_same_real_team>0), captain_multiplier numeric(5,2) not null check(captain_multiplier>=1),
 created_at timestamptz not null default now()
);
create table public.league_members (
 league_id uuid references public.leagues(id) on delete cascade, user_id uuid references public.profiles(id),
 joined_at timestamptz not null default now(), primary key(league_id,user_id)
);
create function public.is_league_member(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.league_members where league_id=target and user_id=auth.uid());
$$;
create table public.fantasy_teams (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), league_id uuid not null references public.leagues(id),
 name text not null check(length(name) between 1 and 80), budget bigint not null check(budget>=0), created_at timestamptz not null default now(),
 unique(league_id,user_id), unique(id,league_id), foreign key(league_id,user_id) references public.league_members(league_id,user_id)
);
-- A roster is the set of these rows; avoid a redundant one-to-one roster header.
create table public.fantasy_roster_players (
 fantasy_team_id uuid not null, league_id uuid not null, player_id uuid references public.players(id),
 acquired_at timestamptz not null default now(), purchase_price bigint not null check(purchase_price>=0),
 primary key(fantasy_team_id,player_id), unique(league_id,player_id),
 foreign key(fantasy_team_id,league_id) references public.fantasy_teams(id,league_id)
);
create table public.matchdays (
 id uuid primary key default gen_random_uuid(), season_id uuid not null references public.seasons(id), number integer not null check(number>0),
 name text not null, start_at timestamptz not null, lock_at timestamptz not null, end_at timestamptz not null,
 status public.matchday_status not null default 'UPCOMING', unique(season_id,number), check(lock_at<=start_at and start_at<end_at)
);
create table public.matches (
 id uuid primary key default gen_random_uuid(), matchday_id uuid not null references public.matchdays(id),
 home_team_id uuid not null references public.teams(id), away_team_id uuid not null references public.teams(id),
 scheduled_at timestamptz not null, status public.match_status not null default 'SCHEDULED',
 home_score integer check(home_score>=0), away_score integer check(away_score>=0), check(home_team_id<>away_team_id)
);
create index matches_matchday_idx on public.matches(matchday_id);
create table public.player_match_performances (
 id uuid primary key default gen_random_uuid(), player_id uuid not null references public.players(id), match_id uuid not null references public.matches(id),
 team_id uuid not null references public.teams(id), races_played integer not null check(races_played>=0), total_race_points numeric not null check(total_race_points>=0),
 average_race_points numeric generated always as (case when races_played=0 then 0 else total_race_points/races_played end) stored,
 team_result text not null check(team_result in ('WIN','LOSS','DRAW','DNP')),
 bonus_points numeric not null default 0 check(bonus_points>=0), penalty_points numeric not null default 0 check(penalty_points>=0), fantasy_points numeric,
 scoring_rule_id uuid references public.scoring_rules(id), raw_stats jsonb not null default '{}' check(jsonb_typeof(raw_stats)='object'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(player_id,match_id)
);
create table public.fantasy_lineups (
 id uuid primary key default gen_random_uuid(), fantasy_team_id uuid not null references public.fantasy_teams(id), matchday_id uuid not null references public.matchdays(id),
 captain_multiplier numeric(5,2) not null check(captain_multiplier>=1), saved_at timestamptz not null default now(), locked_at timestamptz,
 unique(fantasy_team_id,matchday_id)
);
create table public.fantasy_lineup_players (
 lineup_id uuid references public.fantasy_lineups(id), player_id uuid references public.players(id),
 real_team_id uuid not null references public.teams(id), player_name text not null, is_starter boolean not null, is_captain boolean not null default false,
 primary key(lineup_id,player_id), check(not is_captain or is_starter)
);
create unique index one_captain_per_lineup on public.fantasy_lineup_players(lineup_id) where is_captain;
create table public.player_matchday_scores (
 player_id uuid references public.players(id), matchday_id uuid references public.matchdays(id), points numeric not null,
 scoring_rule_id uuid not null references public.scoring_rules(id), processed_at timestamptz not null default now(), primary key(player_id,matchday_id)
);
create table public.fantasy_team_matchday_scores (
 fantasy_team_id uuid references public.fantasy_teams(id), matchday_id uuid references public.matchdays(id), points numeric not null,
 scoring_rule_id uuid not null references public.scoring_rules(id), processed_at timestamptz not null default now(), primary key(fantasy_team_id,matchday_id)
);
create table public.fantasy_transactions (
 id uuid primary key default gen_random_uuid(), fantasy_team_id uuid not null references public.fantasy_teams(id), player_id uuid not null references public.players(id),
 type public.transaction_type not null, amount bigint not null check(amount>=0), previous_owner_id uuid references public.fantasy_teams(id),
 created_at timestamptz not null default now()
);
create table public.player_market_value_history (
 id uuid primary key default gen_random_uuid(), player_id uuid not null references public.players(id), value bigint not null check(value>=0),
 variation bigint not null, percentage_change numeric, reason text not null, timestamp timestamptz not null default now()
);
create index market_history_player_idx on public.player_market_value_history(player_id,timestamp desc);
create table public.import_batches (
 id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id), season_id uuid not null references public.seasons(id),
 player_count integer not null, team_count integer not null, created_at timestamptz not null default now()
);

create function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
create trigger teams_updated before update on public.teams for each row execute function public.set_updated_at();
create trigger players_updated before update on public.players for each row execute function public.set_updated_at();
create trigger performances_updated before update on public.player_match_performances for each row execute function public.set_updated_at();
create function public.record_player_value() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' then
  insert into public.player_market_value_history(player_id,value,variation,percentage_change,reason) values(new.id,new.market_value,0,0,'Valor inicial provisional');
 elsif old.market_value<>new.market_value then
  insert into public.player_market_value_history(player_id,value,variation,percentage_change,reason)
  values(new.id,new.market_value,new.market_value-old.market_value,case when old.market_value=0 then null else (new.market_value-old.market_value)*100.0/old.market_value end,'Ajuste administrativo');
 end if; return new;
end $$;
create trigger player_value_history after insert or update on public.players for each row execute function public.record_player_value();

-- Aggregates are views; historical points aren't copied into mutable player records.
create view public.player_statistics with (security_invoker=true) as
 select p.id as player_id, coalesce(sum(s.points),0) as total_points, coalesce(avg(s.points),0) as average_points,
 (select count(*) from public.player_match_performances perf where perf.player_id=p.id and races_played>0) as matches_played
 from public.players p left join public.player_matchday_scores s on s.player_id=p.id group by p.id;

-- Every table is protected. Future operations must be implemented as checked RPCs.
do $$ declare t text; begin
 foreach t in array array['profiles','seasons','app_config','teams','team_seasons','players','player_seasons','scoring_rules','leagues','league_members','fantasy_teams','fantasy_roster_players','matchdays','matches','player_match_performances','fantasy_lineups','fantasy_lineup_players','player_matchday_scores','fantasy_team_matchday_scores','fantasy_transactions','player_market_value_history','import_batches'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
 foreach t in array array['seasons','app_config','teams','team_seasons','players','player_seasons','scoring_rules','matchdays','matches','player_match_performances','player_matchday_scores','player_market_value_history'] loop
 execute format('grant select on public.%I to anon',t);
 execute format('create policy catalog_read on public.%I for select to anon, authenticated using (true)',t);
 end loop;
end $$;
grant select on public.player_statistics to anon,authenticated;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy league_read on public.leagues for select to authenticated using(public.is_league_member(id) or public.is_admin());
create policy members_read on public.league_members for select to authenticated using(public.is_league_member(league_id) or public.is_admin());
create policy fantasy_read on public.fantasy_teams for select to authenticated using(public.is_league_member(league_id) or public.is_admin());
create policy roster_read on public.fantasy_roster_players for select to authenticated using(public.is_league_member(league_id) or public.is_admin());
create policy lineup_read on public.fantasy_lineups for select to authenticated using(exists(select 1 from public.fantasy_teams f where f.id=fantasy_team_id and (f.user_id=auth.uid() or locked_at is not null)) or public.is_admin());
create policy lineup_players_read on public.fantasy_lineup_players for select to authenticated using(exists(select 1 from public.fantasy_lineups l where l.id=lineup_id));
create policy fantasy_score_read on public.fantasy_team_matchday_scores for select to authenticated using(exists(select 1 from public.fantasy_teams f where f.id=fantasy_team_id));
create policy transactions_read on public.fantasy_transactions for select to authenticated using(exists(select 1 from public.fantasy_teams f where f.id=fantasy_team_id and f.user_id=auth.uid()) or public.is_admin());
create policy import_read on public.import_batches for select to authenticated using(public.is_admin());
grant insert,update,delete on public.teams to authenticated;
grant insert,update on public.players to authenticated;
create policy teams_admin on public.teams for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy players_admin on public.players for all to authenticated using(public.is_admin()) with check(public.is_admin());

revoke all on function public.handle_new_user(), public.record_player_value(), public.set_updated_at() from public,anon,authenticated;
revoke all on function public.is_admin(),public.is_league_member(uuid) from public,anon;
grant execute on function public.is_admin(),public.is_league_member(uuid) to authenticated;

-- One transaction, one advisory lock, revalidated payload, no changes to existing prices or status.
create function public.import_players(payload jsonb, target_season uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare row_data jsonb; tid uuid; pid uuid; initial_price bigint; inserted_count integer=0; updated_count integer=0; team_count integer; exists_before boolean;
begin
 if not (coalesce(auth.role(),'')='service_role' or public.is_admin()) then raise exception 'Solo administradores' using errcode='42501'; end if;
 if jsonb_typeof(payload) is distinct from 'array' or jsonb_array_length(payload) not between 1 and 10000 then raise exception 'Importación inválida'; end if;
 if not exists(select 1 from public.seasons where id=target_season) then raise exception 'Temporada inexistente'; end if;
 perform pg_advisory_xact_lock(743);
 select initial_player_value into strict initial_price from public.app_config where id=true;
 for row_data in select * from jsonb_array_elements(payload) loop
  if coalesce(length(row_data->>'name'),0) not between 1 and 120 or coalesce(length(row_data->>'teamName'),0) not between 1 and 120
   or coalesce(length(row_data->>'sourceKey'),0) not between 1 and 500 or coalesce(length(row_data->>'teamKey'),0) not between 1 and 500
   or coalesce(length(row_data->>'slugBase'),0) not between 1 and 120 or coalesce(length(row_data->>'teamSlugBase'),0) not between 1 and 120 then raise exception 'Fila inválida'; end if;
  insert into public.teams(source_key,name,tag,slug) values(row_data->>'teamKey',row_data->>'teamName',left(coalesce(row_data->>'teamTag',''),20),(row_data->>'teamSlugBase')||'-'||gen_random_uuid()::text)
   on conflict(source_key) do update set name=excluded.name,tag=coalesce(nullif(excluded.tag,''),public.teams.tag) returning id into tid;
  insert into public.team_seasons(team_id,season_id) values(tid,target_season) on conflict do nothing;
  select exists(select 1 from public.players where source_key=row_data->>'sourceKey') into exists_before;
  insert into public.players(source_key,name,slug,team_id,mkcentral_player_id,market_value,initial_value)
   values(row_data->>'sourceKey',row_data->>'name',(row_data->>'slugBase')||'-'||gen_random_uuid()::text,tid,nullif(row_data->>'mkcentralId',''),initial_price,initial_price)
   on conflict(source_key) do update set name=excluded.name,team_id=excluded.team_id,mkcentral_player_id=coalesce(excluded.mkcentral_player_id,public.players.mkcentral_player_id) returning id into pid;
  insert into public.player_seasons(player_id,season_id,team_id) values(pid,target_season,tid) on conflict(player_id,season_id) do update set team_id=excluded.team_id;
  if exists_before then updated_count=updated_count+1; else inserted_count=inserted_count+1; end if;
 end loop;
 select count(distinct r->>'teamKey') into team_count from jsonb_array_elements(payload) r;
 insert into public.import_batches(actor_id,season_id,player_count,team_count) values(auth.uid(),target_season,inserted_count+updated_count,team_count);
 return jsonb_build_object('inserted',inserted_count,'updated',updated_count,'teams',team_count);
end $$;
revoke all on function public.import_players(jsonb,uuid) from public,anon;
grant execute on function public.import_players(jsonb,uuid) to authenticated,service_role;
