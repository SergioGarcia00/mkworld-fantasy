-- Eliminación física solicitada para Breve y todos sus datos dependientes.
do $$
declare
  target uuid;
begin
  select id into target from public.players where lower(trim(name)) = 'breve';
  if target is null then return; end if;

  delete from public.player_weekly_inputs where player_id = target;
  delete from public.player_matchday_scores where player_id = target;
  delete from public.player_match_performances where player_id = target;
  delete from public.player_market_value_history where player_id = target;
  delete from public.fantasy_lineup_players where player_id = target;
  delete from public.fantasy_roster_players where player_id = target;
  delete from public.fantasy_transactions where player_id = target;
  delete from public.market_bid_results where player_id = target;
  delete from public.market_bids where player_id = target;
  delete from public.market_offers where player_id = target;
  delete from public.player_enriched_details where player_id = target;
  delete from public.player_seasons where player_id = target;
  delete from public.players where id = target;
end $$;
