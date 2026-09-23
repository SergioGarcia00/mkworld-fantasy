-- Corrección histórica de Jornada 1: Graco tenía cuatro jugadores con puntos
-- introducidos, pero no llegó a guardar alineación. Se añaden dos plazas
-- fantasma sin puntos para que sus cuatro jugadores reales entren en el cálculo.
do $$
declare
  target_team uuid;
  target_matchday uuid;
  target_lineup uuid;
  ghost_one uuid;
  ghost_two uuid;
begin
  select ft.id, md.id
    into target_team, target_matchday
  from public.fantasy_teams ft
  join public.leagues lg on lg.id = ft.league_id
  join public.matchdays md on md.season_id = lg.season_id and md.number = 1
  where ft.name = 'El Graco'
  limit 1;

  if target_team is null or target_matchday is null then
    raise exception 'No se encontró El Graco o la Jornada 1';
  end if;

  select p.id into ghost_one
  from public.players p
  where p.status = 'ACTIVE'
    and not exists (
      select 1 from public.fantasy_roster_players r
      where r.fantasy_team_id = target_team and r.player_id = p.id
    )
  order by p.name, p.id
  limit 1;

  select p.id into ghost_two
  from public.players p
  where p.status = 'ACTIVE'
    and p.id <> ghost_one
    and not exists (
      select 1 from public.fantasy_roster_players r
      where r.fantasy_team_id = target_team and r.player_id = p.id
    )
  order by p.name, p.id
  limit 1;

  if ghost_one is null or ghost_two is null then
    raise exception 'No hay dos jugadores disponibles para las plazas fantasma';
  end if;

  insert into public.fantasy_lineups as existing(
    fantasy_team_id, matchday_id, captain_multiplier, saved_at, locked_at
  ) values (
    target_team, target_matchday, 1.5, now(), now()
  )
  on conflict (fantasy_team_id, matchday_id) do update
    set locked_at = coalesce(existing.locked_at, excluded.locked_at),
        captain_multiplier = excluded.captain_multiplier;

  select l.id into target_lineup
  from public.fantasy_lineups l
  where l.fantasy_team_id = target_team and l.matchday_id = target_matchday;

  delete from public.fantasy_lineup_players where lineup_id = target_lineup;

  insert into public.fantasy_lineup_players(
    lineup_id, player_id, real_team_id, player_name, is_starter, is_captain
  )
  select target_lineup, p.id, p.team_id, p.name, true, false
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

  perform public.calculate_matchday_scores(target_matchday);
end $$;
