alter table public.player_weekly_inputs
  add column if not exists postponed boolean not null default false;

create or replace function public.submit_player_weekly_score(
  target_team uuid,
  target_matchday uuid,
  target_player uuid,
  first_game integer,
  second_game integer default null,
  postponed boolean default false
)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.fantasy_teams where id=target_team and user_id=auth.uid()) then raise exception 'Equipo no autorizado'; end if;
  if (select test_mode from public.app_config where id=true) then
    if not exists(select 1 from public.app_config c join public.matchdays m on m.id=c.test_matchday_id where c.id=true and c.test_scores_open and m.id=target_matchday and m.status<>'FINISHED') then raise exception 'Envío de puntos cerrado por administración'; end if;
  else
    if exists(select 1 from public.matchdays where id=target_matchday and status in ('LOCKED','FINISHED')) then raise exception 'La jornada está cerrada'; end if;
  end if;
  if not exists(select 1 from public.fantasy_roster_players where fantasy_team_id=target_team and player_id=target_player) then raise exception 'El jugador no pertenece a tu plantilla'; end if;
  if postponed then
    first_game := 0;
    second_game := 0;
  end if;
  insert into public.player_weekly_inputs(fantasy_team_id,player_id,matchday_id,game_one,game_two,postponed)
  values(target_team,target_player,target_matchday,first_game,second_game,postponed)
  on conflict(fantasy_team_id,player_id,matchday_id) do update set game_one=excluded.game_one,game_two=excluded.game_two,postponed=excluded.postponed,submitted_at=now();
end $$;
revoke all on function public.submit_player_weekly_score(uuid,uuid,uuid,integer,integer,boolean) from public,anon;
grant execute on function public.submit_player_weekly_score(uuid,uuid,uuid,integer,integer,boolean) to authenticated;
