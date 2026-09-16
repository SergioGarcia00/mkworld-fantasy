-- Selling is roster management and remains available independently of market opening.
create or replace function public.sell_player(target_fantasy_team uuid, target_player uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare team_row public.fantasy_teams; roster_row public.fantasy_roster_players; player_value bigint; sale_price bigint; before_balance bigint; config_row public.app_config;
begin
  select * into strict team_row from public.fantasy_teams where id=target_fantasy_team and user_id=auth.uid() for update;
  select * into strict roster_row from public.fantasy_roster_players where fantasy_team_id=team_row.id and player_id=target_player for update;
  select market_value into strict player_value from public.players where id=target_player;
  select * into strict config_row from public.app_config where id=true;
  sale_price := floor(player_value * config_row.market_sell_percentage / 100);
  before_balance := team_row.budget;
  delete from public.fantasy_roster_players where fantasy_team_id=team_row.id and player_id=target_player;
  update public.fantasy_teams set budget=budget+sale_price where id=team_row.id;
  insert into public.fantasy_transactions(fantasy_team_id,player_id,type,amount,balance_before,balance_after,description,metadata)
  values(team_row.id,target_player,'PILOT_MARKET_SALE',sale_price,before_balance,before_balance+sale_price,'Venta inmediata al mercado',jsonb_build_object('marketValue',player_value,'sellPercentage',config_row.market_sell_percentage,'salePrice',sale_price));
end $$;
revoke all on function public.sell_player(uuid,uuid) from public,anon;
grant execute on function public.sell_player(uuid,uuid) to authenticated;
