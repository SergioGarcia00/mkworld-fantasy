-- Cuatro jornadas de demostración para probar el calendario y el flujo semanal.
insert into public.matchdays(season_id, number, name, start_at, lock_at, end_at)
select
  '00000000-0000-4000-8000-000000000003'::uuid,
  n,
  'Jornada DEMO ' || n,
  now() + n * interval '7 days',
  now() + n * interval '7 days' - interval '1 hour',
  now() + n * interval '7 days' + interval '1 day'
from generate_series(1, 4) as n
on conflict (season_id, number) do nothing;
