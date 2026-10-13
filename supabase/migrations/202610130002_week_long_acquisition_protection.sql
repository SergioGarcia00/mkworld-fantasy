-- Every acquisition receives one full week of clause protection.
update public.app_config
set clause_protection_hours = 168,
    initial_clause_protection_hours = 168
where id = true;

create or replace function public.set_initial_clause_protection()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.clause_protected_until is null then
    new.clause_protected_until := now() + interval '7 days';
  end if;
  return new;
end $$;

-- Recreate the trigger so auction/market acquisitions and other roster inserts
-- consistently receive the same one-week protection.
drop trigger if exists roster_initial_clause_protection on public.fantasy_roster_players;
create trigger roster_initial_clause_protection
before insert on public.fantasy_roster_players
for each row execute function public.set_initial_clause_protection();
