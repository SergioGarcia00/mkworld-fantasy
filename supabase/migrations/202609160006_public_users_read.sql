-- The public directory exposes team names and rosters only; mutations stay authenticated.
grant select on public.profiles to anon;
grant select on public.fantasy_teams to anon;
grant select on public.fantasy_roster_players to anon;
drop policy if exists profile_read_anon on public.profiles;
create policy profile_read_anon on public.profiles for select to anon using (true);
drop policy if exists fantasy_read_anon on public.fantasy_teams;
create policy fantasy_read_anon on public.fantasy_teams for select to anon using (true);
drop policy if exists roster_read_anon on public.fantasy_roster_players;
create policy roster_read_anon on public.fantasy_roster_players for select to anon using (true);
