-- The public Users page now uses spectator_users(). Keep private roster rows
-- out of direct anonymous queries (budgets and account ids must stay private).
drop policy if exists fantasy_read_anon on public.fantasy_teams;
drop policy if exists roster_read_anon on public.fantasy_roster_players;
revoke select on public.fantasy_teams from anon;
revoke select on public.fantasy_roster_players from anon;
