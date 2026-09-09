-- Puntuaciones demo variadas para cada jugador de cada plantilla y jornada.
insert into public.player_weekly_inputs(fantasy_team_id, player_id, matchday_id, game_one, game_two)
select
  r.fantasy_team_id,
  r.player_id,
  d.id,
  12 + (('x' || substr(md5('g1-' || r.fantasy_team_id || '-' || r.player_id || '-' || d.number), 1, 4))::bit(16)::int % 4),
  12 + (('x' || substr(md5('g2-' || r.fantasy_team_id || '-' || r.player_id || '-' || d.number), 1, 4))::bit(16)::int % 4)
from public.fantasy_roster_players r
cross join public.matchdays d
where d.season_id = '00000000-0000-4000-8000-000000000003'::uuid
  and d.number between 1 and 4
on conflict (fantasy_team_id, player_id, matchday_id) do update
set game_one = excluded.game_one, game_two = excluded.game_two, submitted_at = now();

do $$
declare day_id uuid;
begin
  for day_id in
    select id from public.matchdays
    where season_id = '00000000-0000-4000-8000-000000000003'::uuid and number between 1 and 4
  loop
    perform public.calculate_matchday_scores(day_id);
  end loop;
end $$;
