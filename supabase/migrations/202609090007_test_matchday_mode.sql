-- Inicia una jornada de prueba controlada durante una hora.
create or replace function public.admin_start_test_matchday(target_matchday uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  update public.matchdays
  set status='OPEN', lock_at=now() + interval '45 minutes', start_at=now(), end_at=now() + interval '1 hour'
  where id=target_matchday;
  if not found then raise exception 'Jornada no encontrada'; end if;
end $$;
revoke all on function public.admin_start_test_matchday(uuid) from public, anon;
grant execute on function public.admin_start_test_matchday(uuid) to authenticated;
