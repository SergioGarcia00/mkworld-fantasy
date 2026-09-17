-- Teams may operate with a negative cash balance. They must settle it before
-- the next jornada starts (the standard lock is Sunday at 19:00 Madrid time).
create or replace function public.require_non_negative_balance_before_lineup_lock()
returns trigger language plpgsql security definer set search_path = '' as $$
declare current_balance bigint;
begin
  if new.locked_at is not null and old.locked_at is null then
    select budget into current_balance
      from public.fantasy_teams where id = new.fantasy_team_id;
    if current_balance < 0 then
      raise exception 'Debes vender suficientes jugadores para dejar el balance en 0 o positivo antes de comenzar la jornada';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists lineup_balance_check on public.fantasy_lineups;
create trigger lineup_balance_check
before update of locked_at on public.fantasy_lineups
for each row execute function public.require_non_negative_balance_before_lineup_lock();

revoke all on function public.require_non_negative_balance_before_lineup_lock() from public, anon;
grant execute on function public.require_non_negative_balance_before_lineup_lock() to authenticated;
