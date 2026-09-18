-- Remove teams and players that are not part of the official Season 3 divisions.
do $$
declare
  extra_teams uuid[];
  extra_players uuid[];
begin
  select coalesce(array_agg(t.id), '{}'::uuid[]) into extra_teams
  from public.teams t
  where not exists (
    select 1 from public.season_team_seedings s
    where s.season_id = '00000000-0000-4000-8000-000000000003'::uuid
      and s.team_id = t.id
  );

  select coalesce(array_agg(p.id), '{}'::uuid[]) into extra_players
  from public.players p
  where p.team_id = any(extra_teams);

  delete from public.player_weekly_inputs where player_id = any(extra_players);
  delete from public.player_matchday_scores where player_id = any(extra_players);
  delete from public.player_match_performances where player_id = any(extra_players) or team_id = any(extra_teams);
  delete from public.player_market_value_history where player_id = any(extra_players);
  delete from public.fantasy_lineup_players where player_id = any(extra_players) or real_team_id = any(extra_teams);
  delete from public.fantasy_roster_players where player_id = any(extra_players);
  delete from public.fantasy_transactions where player_id = any(extra_players);
  delete from public.market_bid_results where player_id = any(extra_players);
  delete from public.market_bids where player_id = any(extra_players);
  delete from public.market_offers where player_id = any(extra_players);
  delete from public.player_seasons where player_id = any(extra_players) or team_id = any(extra_teams);
  delete from public.players where id = any(extra_players);

  delete from public.matches where home_team_id = any(extra_teams) or away_team_id = any(extra_teams);
  delete from public.team_seasons where team_id = any(extra_teams);
  delete from public.season_team_seedings where team_id = any(extra_teams);
  delete from public.teams where id = any(extra_teams);
end $$;
