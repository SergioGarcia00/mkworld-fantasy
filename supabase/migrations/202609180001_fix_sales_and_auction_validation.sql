-- Ventas y adjudicación: reglas explícitas y reintentables.
-- La venta directa no depende de que el mercado de subastas esté abierto.
create or replace function public.sell_player(target_fantasy_team uuid, target_player uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  team_row public.fantasy_teams;
  roster_row public.fantasy_roster_players;
  player_value bigint;
  sale_price bigint;
  before_balance bigint;
  config_row public.app_config;
begin
  select * into strict team_row
    from public.fantasy_teams
   where id=target_fantasy_team and user_id=auth.uid()
   for update;
  select * into strict roster_row
    from public.fantasy_roster_players
   where fantasy_team_id=team_row.id and player_id=target_player
   for update;
  select market_value into strict player_value from public.players where id=target_player;
  select * into strict config_row from public.app_config where id=true;
  sale_price := floor(player_value * config_row.market_sell_percentage / 100);
  before_balance := team_row.budget;

  delete from public.fantasy_roster_players
   where fantasy_team_id=team_row.id and player_id=target_player;
  update public.fantasy_teams set budget=budget+sale_price where id=team_row.id;
  insert into public.fantasy_transactions
    (fantasy_team_id,player_id,type,amount,balance_before,balance_after,description,metadata)
  values
    (team_row.id,target_player,'PILOT_MARKET_SALE',sale_price,before_balance,
     before_balance+sale_price,'Venta inmediata al mercado',
     jsonb_build_object('marketValue',player_value,
       'sellPercentage',config_row.market_sell_percentage,'salePrice',sale_price));
end $$;
revoke all on function public.sell_player(uuid,uuid) from public,anon;
grant execute on function public.sell_player(uuid,uuid) to authenticated;

-- Un pujador solo puede ganar si tiene hueco y saldo suficiente.
-- Si no es válido, se prueba automáticamente la siguiente puja más alta;
-- sin adjudicación no se cobra nada y el resultado queda reintentable por admin.
create or replace function public.admin_first_week_settle(target_day date)
returns integer language plpgsql security definer set search_path='' as $$
declare
  cfg public.app_config;
  offer record;
  bid record;
  ft record;
  awarded integer:=0;
begin
  if not public.is_admin() and auth.role()<>'service_role' then raise exception 'Solo administradores'; end if;
  select * into strict cfg from public.app_config where id=true for update;
  for offer in
    select o.* from public.market_offers o
     where o.week_start=target_day
       and o.season_id=(select season_id from public.leagues where id=cfg.official_league_id)
     order by o.slot for update
  loop
    if exists(select 1 from public.market_bid_results where market_offer_id=offer.id) then continue; end if;
    for bid in
      select b.* from public.market_bids b
       join public.fantasy_teams t on t.id=b.fantasy_team_id
       where b.market_offer_id=offer.id and t.league_id=cfg.official_league_id
       order by b.amount desc,b.created_at,b.id
    loop
      select * into strict ft from public.fantasy_teams where id=bid.fantasy_team_id for update;
      if exists(select 1 from public.fantasy_roster_players where fantasy_team_id=ft.id and player_id=offer.player_id)
         or (select count(*) from public.fantasy_roster_players where fantasy_team_id=ft.id)>=cfg.squad_size
         or ft.budget < bid.amount then continue; end if;
      update public.fantasy_teams set budget=budget-bid.amount where id=ft.id;
      insert into public.fantasy_roster_players(fantasy_team_id,league_id,player_id,purchase_price)
        values(ft.id,ft.league_id,offer.player_id,bid.amount);
      insert into public.fantasy_transactions
        (fantasy_team_id,player_id,type,amount,description,idempotency_key)
        values(ft.id,offer.player_id,'BUY',bid.amount,'Adjudicación de subasta · primera semana','first-week-auction:'||offer.id);
      insert into public.market_bid_results
        (market_offer_id,player_id,fantasy_team_id,winning_bid_id,winning_amount)
        values(offer.id,offer.player_id,ft.id,bid.id,bid.amount);
      awarded:=awarded+1;
      exit;
    end loop;
  end loop;
  update public.app_config set first_week_market_open=false,test_market_open=false
   where id=true and first_week_market_date=target_day;
  return awarded;
end $$;
revoke all on function public.admin_first_week_settle(date) from public,anon;
grant execute on function public.admin_first_week_settle(date) to authenticated;
