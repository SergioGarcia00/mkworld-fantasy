-- Tras adjudicar las pujas pendientes de Graco, su plantilla ya tiene seis
-- jugadores reales. La alineación histórica debe reflejar esos seis pilotos.
do $$
declare
  target_team uuid;
  target_matchday uuid;
  target_lineup uuid;
  captain_player uuid;
begin
  select ft.id, md.id
    into target_team, target_matchday
  from public.fantasy_teams ft
  join public.leagues lg on lg.id = ft.league_id
  join public.matchdays md on md.season_id = lg.season_id and md.number = 2
  where ft.name = 'El Graco'
  limit 1;

  select l.id into target_lineup
  from public.fantasy_lineups l
  where l.fantasy_team_id = target_team and l.matchday_id = target_matchday;

  select r.player_id into captain_player
  from public.fantasy_roster_players r
  join public.players p on p.id = r.player_id
  where r.fantasy_team_id = target_team and lower(p.name) like 'zekeke%'
  limit 1;

  if target_team is null or target_matchday is null or target_lineup is null or captain_player is null then
    raise exception 'No se pudo localizar la alineación de Jornada 2 de El Graco';
  end if;

  delete from public.player_weekly_inputs i
  where i.fantasy_team_id = target_team
    and i.matchday_id = target_matchday
    and not exists (
      select 1 from public.fantasy_roster_players r
      where r.fantasy_team_id = target_team and r.player_id = i.player_id
    );

  delete from public.fantasy_lineup_players where lineup_id = target_lineup;

  insert into public.fantasy_lineup_players(
    lineup_id, player_id, real_team_id, player_name, is_starter, is_captain
  )
  select target_lineup, p.id, p.team_id, p.name, true, p.id = captain_player
  from public.fantasy_roster_players r
  join public.players p on p.id = r.player_id
  where r.fantasy_team_id = target_team;
end $$;
