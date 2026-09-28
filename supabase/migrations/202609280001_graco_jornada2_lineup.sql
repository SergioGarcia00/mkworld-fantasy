-- Corrección histórica de Jornada 2: se registra la alineación de El Graco
-- a partir de la captura recibida antes del cierre. Sus cuatro jugadores
-- actuales ocupan cuatro plazas y las dos restantes se mantienen a 0.
do $$
declare
  target_team uuid;
  target_matchday uuid;
  target_lineup uuid;
  captain_player uuid;
  ghost_one uuid;
  ghost_two uuid;
begin
  select ft.id, md.id
    into target_team, target_matchday
  from public.fantasy_teams ft
  join public.leagues lg on lg.id = ft.league_id
  join public.matchdays md on md.season_id = lg.season_id and md.number = 2
  where ft.name = 'El Graco'
  limit 1;

  if target_team is null or target_matchday is null then
    raise exception 'No se encontró El Graco o la Jornada 2';
  end if;

  select r.player_id into captain_player
  from public.fantasy_roster_players r
  join public.players p on p.id = r.player_id
  where r.fantasy_team_id = target_team
    and lower(p.name) like 'zekeke%'
  limit 1;

  if captain_player is null then
    raise exception 'No se encontró Zekeke en la plantilla de El Graco';
  end if;

  -- Reutilizamos las mismas dos plazas que se usaron como relleno histórico
  -- para Graco en la Jornada 1.
  select lp.player_id into ghost_one
  from public.fantasy_lineup_players lp
  join public.fantasy_lineups l on l.id = lp.lineup_id
  where l.fantasy_team_id = target_team
    and l.matchday_id = (
      select m1.id from public.matchdays m1
      join public.leagues l1 on l1.season_id = m1.season_id
      where l1.id = (select league_id from public.fantasy_teams where id = target_team)
        and m1.number = 1
    )
    and lp.player_name = 'Jugador fantasma 1 (Graco)'
  limit 1;

  select lp.player_id into ghost_two
  from public.fantasy_lineup_players lp
  join public.fantasy_lineups l on l.id = lp.lineup_id
  where l.fantasy_team_id = target_team
    and l.matchday_id = (
      select m1.id from public.matchdays m1
      join public.leagues l1 on l1.season_id = m1.season_id
      where l1.id = (select league_id from public.fantasy_teams where id = target_team)
        and m1.number = 1
    )
    and lp.player_name = 'Jugador fantasma 2 (Graco)'
  limit 1;

  if ghost_one is null or ghost_two is null then
    raise exception 'No se encontraron las dos plazas fantasma de Graco';
  end if;

  insert into public.fantasy_lineups as existing(
    fantasy_team_id, matchday_id, captain_multiplier, saved_at, locked_at
  ) values (
    target_team, target_matchday, 1.5, now(), now()
  )
  on conflict (fantasy_team_id, matchday_id) do update
    set captain_multiplier = excluded.captain_multiplier,
        saved_at = excluded.saved_at,
        locked_at = excluded.locked_at
  returning id into target_lineup;

  delete from public.fantasy_lineup_players where lineup_id = target_lineup;

  insert into public.fantasy_lineup_players(
    lineup_id, player_id, real_team_id, player_name, is_starter, is_captain
  )
  select target_lineup, p.id, p.team_id, p.name, true, p.id = captain_player
  from public.fantasy_roster_players r
  join public.players p on p.id = r.player_id
  where r.fantasy_team_id = target_team
  union all
  select target_lineup, p.id, p.team_id, 'Jugador fantasma 1 (Graco)', true, false
  from public.players p where p.id = ghost_one
  union all
  select target_lineup, p.id, p.team_id, 'Jugador fantasma 2 (Graco)', true, false
  from public.players p where p.id = ghost_two;

  insert into public.player_weekly_inputs(
    fantasy_team_id, player_id, matchday_id, game_one, game_two, postponed
  ) values
    (target_team, ghost_one, target_matchday, 0, 0, false),
    (target_team, ghost_two, target_matchday, 0, 0, false)
  on conflict (fantasy_team_id, player_id, matchday_id) do update
    set game_one = 0, game_two = 0, postponed = false;
end $$;
