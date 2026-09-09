-- Reutiliza la alineación de DEMO1 en las jornadas siguientes.
delete from public.fantasy_lineups l
using public.matchdays d
where d.id = l.matchday_id and d.number in (2, 3, 4)
  and d.season_id = '00000000-0000-4000-8000-000000000003'::uuid;

insert into public.fantasy_lineups(fantasy_team_id, matchday_id, captain_multiplier)
select l.fantasy_team_id, target_day.id, l.captain_multiplier
from public.fantasy_lineups l
join public.matchdays source_day on source_day.id = l.matchday_id and source_day.number = 1
join public.matchdays target_day on target_day.season_id = source_day.season_id and target_day.number in (2, 3, 4)
on conflict (fantasy_team_id, matchday_id) do update
set captain_multiplier = excluded.captain_multiplier, saved_at = now(), locked_at = null;

insert into public.fantasy_lineup_players(lineup_id, player_id, real_team_id, player_name, is_starter, is_captain)
select target_lineup.id, source_player.player_id, source_player.real_team_id, source_player.player_name, source_player.is_starter, source_player.is_captain
from public.fantasy_lineup_players source_player
join public.fantasy_lineups source_lineup on source_lineup.id = source_player.lineup_id
join public.matchdays source_day on source_day.id = source_lineup.matchday_id and source_day.number = 1
join public.fantasy_lineups target_lineup on target_lineup.fantasy_team_id = source_lineup.fantasy_team_id
join public.matchdays target_day on target_day.id = target_lineup.matchday_id and target_day.season_id = source_day.season_id and target_day.number in (2, 3, 4)
on conflict (lineup_id, player_id) do update
set real_team_id = excluded.real_team_id, player_name = excluded.player_name, is_starter = excluded.is_starter, is_captain = excluded.is_captain;

do $$
declare day_id uuid;
begin
  for day_id in select id from public.matchdays where season_id = '00000000-0000-4000-8000-000000000003'::uuid and number in (2, 3, 4)
  loop perform public.calculate_matchday_scores(day_id); end loop;
end $$;
