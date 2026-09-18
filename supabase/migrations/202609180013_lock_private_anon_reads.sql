-- Foundation granted a broad catalog policy to anonymous callers. Remove it
-- from participant and administration tables; public views use dedicated RPCs.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','leagues','league_members','fantasy_teams','fantasy_roster_players',
    'fantasy_lineups','fantasy_lineup_players','fantasy_team_matchday_scores',
    'fantasy_transactions','import_batches','player_weekly_inputs'
  ] loop
    execute format('drop policy if exists catalog_read on public.%I', table_name);
    execute format('revoke select on public.%I from anon', table_name);
  end loop;
end $$;
