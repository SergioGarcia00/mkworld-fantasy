create table if not exists public.player_weekly_inputs (
  fantasy_team_id uuid not null references public.fantasy_teams(id) on delete cascade,
  player_id uuid not null references public.players(id),
  matchday_id uuid not null references public.matchdays(id) on delete cascade,
  game_one integer not null check (game_one between 12 and 180),
  game_two integer check (game_two is null or game_two between 12 and 180),
  submitted_at timestamptz not null default now(),
  primary key (fantasy_team_id, player_id, matchday_id)
);
alter table public.player_weekly_inputs enable row level security;
create policy weekly_inputs_owner on public.player_weekly_inputs for all to authenticated using (exists(select 1 from public.fantasy_teams f where f.id=fantasy_team_id and f.user_id=auth.uid())) with check (exists(select 1 from public.fantasy_teams f where f.id=fantasy_team_id and f.user_id=auth.uid()));

create or replace function public.submit_player_weekly_score(target_team uuid,target_matchday uuid,target_player uuid,first_game integer,second_game integer default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.fantasy_teams where id=target_team and user_id=auth.uid()) then raise exception 'Equipo no autorizado'; end if;
 if exists(select 1 from public.matchdays where id=target_matchday and status in ('LOCKED','FINISHED')) then raise exception 'La jornada está cerrada'; end if;
 if not exists(select 1 from public.fantasy_roster_players where fantasy_team_id=target_team and player_id=target_player) then raise exception 'El jugador no pertenece a tu plantilla'; end if;
 insert into public.player_weekly_inputs(fantasy_team_id,player_id,matchday_id,game_one,game_two) values(target_team,target_player,target_matchday,first_game,second_game)
 on conflict(fantasy_team_id,player_id,matchday_id) do update set game_one=excluded.game_one,game_two=excluded.game_two,submitted_at=now();
end $$;
revoke all on function public.submit_player_weekly_score(uuid,uuid,uuid,integer,integer) from public,anon;
grant execute on function public.submit_player_weekly_score(uuid,uuid,uuid,integer,integer) to authenticated;
