-- Estadísticas públicas de jugadores con puntuaciones semanales introducidas.
drop function if exists public.public_player_weekly_stats();
create or replace function public.public_player_weekly_stats()
returns table(player_id uuid, total_points numeric, entries bigint, users bigint, matchdays bigint, games bigint, average_points numeric)
language sql stable security definer set search_path = public
as $$
  select player_id,
    sum(game_one + coalesce(game_two, 0)) as total_points,
    count(*) as entries,
    count(distinct fantasy_team_id) as users,
    count(distinct matchday_id) as matchdays,
    sum(case when game_two is null then 1 else 2 end) as games,
    round(sum(game_one + coalesce(game_two, 0)) / nullif(sum(case when game_two is null then 1 else 2 end), 0), 2) as average_points
  from public.player_weekly_inputs
  group by player_id
  having count(*) > 0;
$$;

revoke all on function public.public_player_weekly_stats() from public;
grant execute on function public.public_player_weekly_stats() to anon, authenticated;
