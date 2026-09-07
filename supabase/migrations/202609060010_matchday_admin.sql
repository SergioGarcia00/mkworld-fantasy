create or replace function public.admin_set_matchday_status(target_matchday uuid,new_status public.matchday_status)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Solo administradores'; end if;
 update public.matchdays set status=new_status where id=target_matchday;
 if not found then raise exception 'Jornada no encontrada'; end if;
 if new_status='FINISHED' then perform public.calculate_matchday_scores(target_matchday); end if;
end $$;
revoke all on function public.admin_set_matchday_status(uuid,public.matchday_status) from public,anon;
grant execute on function public.admin_set_matchday_status(uuid,public.matchday_status) to authenticated;
