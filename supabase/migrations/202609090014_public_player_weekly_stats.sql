-- Estadísticas públicas de jugadores con puntuaciones semanales introducidas.
create or replace function public.public_player_weekly_stats()
returns table(player_id uuid, total_points numeric, entries bigint)
language sql stable security definer set search_path = public
as $$
  select player_id,
    sum(game_one + coalesce(game_two, 0)) as total_points,
    count(*) as entries
  from public.player_weekly_inputs
  group by player_id
  having count(*) > 0;
$$;

revoke all on function public.public_player_weekly_stats() from public;
grant execute on function public.public_player_weekly_stats() to anon, authenticated;
