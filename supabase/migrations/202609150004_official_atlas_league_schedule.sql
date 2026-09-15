-- Atlas League Fantasy Season 3: calendario oficial de 7 jornadas.
-- La fase regular ocupa cinco domingos y los playoffs las dos semanas siguientes.
do $$
declare
  target_season uuid := '00000000-0000-4000-8000-000000000003';
begin
  update public.seasons
  set starts_at = '2026-09-20 19:00:00 Europe/Madrid'::timestamptz,
      ends_at = '2026-11-01 23:59:00 Europe/Madrid'::timestamptz
  where id = target_season;

  insert into public.matchdays(season_id, number, name, start_at, lock_at, end_at, status)
  values
    (target_season, 1, 'Jornada 1 · Fase regular', '2026-09-20 19:00:00 Europe/Madrid', '2026-09-20 19:00:00 Europe/Madrid', '2026-09-20 23:59:00 Europe/Madrid', 'UPCOMING'),
    (target_season, 2, 'Jornada 2 · Fase regular', '2026-09-27 19:00:00 Europe/Madrid', '2026-09-27 19:00:00 Europe/Madrid', '2026-09-27 23:59:00 Europe/Madrid', 'UPCOMING'),
    (target_season, 3, 'Jornada 3 · Fase regular', '2026-10-04 19:00:00 Europe/Madrid', '2026-10-04 19:00:00 Europe/Madrid', '2026-10-04 23:59:00 Europe/Madrid', 'UPCOMING'),
    (target_season, 4, 'Jornada 4 · Fase regular', '2026-10-11 19:00:00 Europe/Madrid', '2026-10-11 19:00:00 Europe/Madrid', '2026-10-11 23:59:00 Europe/Madrid', 'UPCOMING'),
    (target_season, 5, 'Jornada 5 · Fase regular', '2026-10-18 19:00:00 Europe/Madrid', '2026-10-18 19:00:00 Europe/Madrid', '2026-10-18 23:59:00 Europe/Madrid', 'UPCOMING'),
    (target_season, 6, 'Jornada 6 · Playoffs · Semifinales', '2026-10-25 19:00:00 Europe/Madrid', '2026-10-25 19:00:00 Europe/Madrid', '2026-10-25 23:59:00 Europe/Madrid', 'UPCOMING'),
    (target_season, 7, 'Jornada 7 · Playoffs · Final', '2026-11-01 19:00:00 Europe/Madrid', '2026-11-01 19:00:00 Europe/Madrid', '2026-11-01 23:59:00 Europe/Madrid', 'UPCOMING')
  on conflict (season_id, number) do update
    set name = excluded.name,
        start_at = excluded.start_at,
        lock_at = excluded.lock_at,
        end_at = excluded.end_at,
        status = case when public.matchdays.status = 'FINISHED' then public.matchdays.status else 'UPCOMING' end;
end $$;

