-- DEMO5 es la siguiente jornada disponible para probar el flujo real.
insert into public.matchdays(season_id, number, name, start_at, lock_at, end_at, status)
select
  '00000000-0000-4000-8000-000000000003'::uuid,
  5,
  'Jornada DEMO 5',
  now() + interval '7 days',
  now() + interval '7 days' - interval '1 hour',
  now() + interval '8 days',
  'OPEN'::public.matchday_status
where not exists (
  select 1 from public.matchdays
  where season_id = '00000000-0000-4000-8000-000000000003'::uuid and number = 5
);

update public.matchdays
set status = case when number = 5 then 'OPEN'::public.matchday_status else 'FINISHED'::public.matchday_status end
where season_id = '00000000-0000-4000-8000-000000000003'::uuid
  and number between 1 and 5;
