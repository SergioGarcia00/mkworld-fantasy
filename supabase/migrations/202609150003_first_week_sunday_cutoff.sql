-- Sunday closes the market early so players can confirm the Atlas League lineup.
create or replace function public.admin_first_week_tick()
returns integer language plpgsql security definer set search_path='' as $$
declare cfg public.app_config; local_now timestamp; today date; current_day date;
        generated integer:=0; market_close time; lineup_close time;
begin
  if not public.is_admin() and auth.role()<>'service_role' then raise exception 'Solo administradores'; end if;
  select * into strict cfg from public.app_config where id=true for update;
  if not cfg.first_week_mode then return 0; end if;
  local_now:=now() at time zone 'Europe/Madrid'; today:=local_now::date;
  if today < date '2026-09-16' or today > date '2026-09-20' then return 0; end if;
  market_close := case when today = date '2026-09-20' then time '18:00' else time '23:00' end;
  lineup_close := case when today = date '2026-09-20' then time '19:00' else null end;
  current_day:=coalesce(cfg.first_week_market_date,date '2026-09-16');
  if current_day < today and cfg.first_week_market_open then perform public.admin_first_week_settle(current_day); end if;
  if local_now::time >= time '10:00' and (select first_week_market_date from public.app_config where id=true) is distinct from today then
    generated:=public.admin_first_week_shop(today);
  end if;
  if local_now::time >= market_close and (select first_week_market_open from public.app_config where id=true) then
    perform public.admin_first_week_settle(today);
  end if;
  if today = date '2026-09-20' and local_now::time >= lineup_close then
    update public.app_config set test_lineup_open=false where id=true;
  end if;
  return generated;
end $$;
revoke all on function public.admin_first_week_tick() from public,anon;
grant execute on function public.admin_first_week_tick() to authenticated,service_role;
