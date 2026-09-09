-- Mantiene DEMO1 como jornada activa para poder probar el flujo de alineación.
update public.matchdays
set status = case when number = 1 then 'OPEN'::public.matchday_status else 'FINISHED'::public.matchday_status end
where season_id = '00000000-0000-4000-8000-000000000003'::uuid
  and number between 1 and 4;
