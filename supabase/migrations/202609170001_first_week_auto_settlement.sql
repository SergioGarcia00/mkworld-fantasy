-- Automatic first-week market cycle: settle the previous shop even when the
-- admin flag was already switched off, then let the next shop open normally.
create or replace function public.admin_first_week_tick()
returns integer language plpgsql security definer set search_path='' as $$
declare cfg public.app_config; local_now timestamp; today date; current_day date;
        next_day date; generated integer:=0; market_close time;
begin
  if not public.is_admin() and auth.role()<>'service_role' then raise exception 'Solo administradores'; end if;
  select * into strict cfg from public.app_config where id=true for update;
  if not cfg.first_week_mode then return 0; end if;
  local_now:=now() at time zone 'Europe/Madrid'; today:=local_now::date;
  if today < date '2026-09-16' or today > date '2026-09-20' then return 0; end if;
  market_close := case when today = date '2026-09-20' then time '18:00' else time '23:00' end;
  current_day:=coalesce(cfg.first_week_market_date,date '2026-09-16');

  -- Settlement is idempotent and must not depend on the open flag: a previous
  -- shop may have been closed manually or by an earlier tick before settlement.
  if current_day < today then
    perform public.admin_first_week_settle(current_day);
    -- Recover a missed tick and publish today's shop immediately.
    if today <= date '2026-09-20' then
      generated:=public.admin_first_week_shop(today);
    end if;
  end if;

  if local_now::time >= market_close
     and (select first_week_market_open from public.app_config where id=true) then
    perform public.admin_first_week_settle(today);
    -- Once a shop closes, the next day's ten offers open straight away.
    next_day:=today + 1;
    if next_day <= date '2026-09-20' then
      generated:=public.admin_first_week_shop(next_day);
    end if;
  end if;
  if today = date '2026-09-20' and local_now::time >= time '19:00' then
    update public.app_config set test_lineup_open=false where id=true;
  end if;
  return generated;
end $$;
revoke all on function public.admin_first_week_tick() from public,anon;
grant execute on function public.admin_first_week_tick() to authenticated,service_role;

-- Ensure the minute job exists when pg_cron is available. The migration is
-- safe on projects where the extension is not installed.
do $$ begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    begin
      perform cron.unschedule('mkworld-first-week-2026');
    exception when others then null;
    end;
    perform cron.schedule('mkworld-first-week-2026','* * * * *','select public.admin_first_week_tick()');
  end if;
exception when others then null;
end $$;
