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

-- Durante el mercado se permiten plantillas temporales de más de 10.
-- El límite se comprueba al guardar la alineación, que debe tener 10 jugadores.
create or replace function public.save_lineup(target_team uuid, target_matchday uuid, starters uuid[], captain uuid)
returns void language plpgsql security definer set search_path='' as $$
declare saved_lineup_id uuid; owned_count integer; roster_count integer; required_size integer;
begin
 if not exists(select 1 from public.fantasy_teams where id=target_team and user_id=auth.uid()) then raise exception 'Equipo no autorizado'; end if;
 select squad_size into required_size from public.app_config where id=true;
 select count(*) into roster_count from public.fantasy_roster_players where fantasy_team_id=target_team;
 if roster_count <> required_size then raise exception 'Debes tener exactamente % jugadores antes de confirmar la alineación', required_size; end if;
 if (select test_mode from public.app_config where id=true) then
   if not exists(select 1 from public.app_config c join public.matchdays m on m.id=c.test_matchday_id where c.id=true and c.test_lineup_open and m.id=target_matchday and m.status<>'FINISHED') then raise exception 'Alineaciones cerradas por administración'; end if;
 else
   if exists(select 1 from public.matchdays where id=target_matchday and status in ('LOCKED','FINISHED')) then raise exception 'La jornada está cerrada'; end if;
   if not exists(select 1 from public.matchdays where id=target_matchday and now() < least(lock_at, (date_trunc('week', start_at at time zone 'Europe/Madrid') + interval '5 days 23 hours 59 minutes') at time zone 'Europe/Madrid')) then raise exception 'El plazo de alineación ha terminado'; end if;
 end if;
 if array_length(starters,1) <> 6 then raise exception 'Debes elegir exactamente 6 titulares'; end if;
 if captain is null or not captain=any(starters) then raise exception 'El capitán debe ser titular'; end if;
 select count(*) into owned_count from public.fantasy_roster_players where fantasy_team_id=target_team and player_id=any(starters);
 if owned_count <> 6 then raise exception 'Todos los titulares deben pertenecer a tu plantilla'; end if;
 insert into public.fantasy_lineups(fantasy_team_id,matchday_id,captain_multiplier) values(target_team,target_matchday,1.5)
 on conflict(fantasy_team_id,matchday_id) do update set saved_at=now(),locked_at=null returning id into saved_lineup_id;
 delete from public.fantasy_lineup_players where lineup_id=saved_lineup_id;
 insert into public.fantasy_lineup_players(lineup_id,player_id,real_team_id,player_name,is_starter,is_captain)
 select saved_lineup_id,r.player_id,p.team_id,p.name,true,r.player_id=captain from public.fantasy_roster_players r join public.players p on p.id=r.player_id where r.fantasy_team_id=target_team and r.player_id=any(starters);
end $$;
revoke all on function public.save_lineup(uuid,uuid,uuid[],uuid) from public,anon;
grant execute on function public.save_lineup(uuid,uuid,uuid[],uuid) to authenticated;

create or replace function public.pay_player_clause(target_player uuid,idempotency text)
returns table(pilot_id uuid,previous_owner_id uuid,new_owner_id uuid,clause_paid bigint,buyer_balance_after bigint,seller_balance_after bigint,protected_until timestamptz)
language plpgsql security definer set search_path='' as $$
declare buyer public.fantasy_teams; seller public.fantasy_teams; roster_row public.fantasy_roster_players; player_row public.players; cfg public.app_config; clause_amount bigint; base_clause bigint; before_buyer bigint; before_seller bigint; until_at timestamptz;
begin
 select * into strict buyer from public.fantasy_teams where user_id=auth.uid() for update;
 select * into strict roster_row from public.fantasy_roster_players where player_id=target_player for update;
 select * into strict seller from public.fantasy_teams where id=roster_row.fantasy_team_id for update;
 if buyer.id=seller.id then raise exception 'No puedes pagar tu propia cláusula'; end if;
 select * into strict player_row from public.players where id=target_player;
 select * into strict cfg from public.app_config where id=true;
 if not cfg.test_mode and roster_row.clause_protected_until is not null and roster_row.clause_protected_until > now() then raise exception 'El piloto está protegido temporalmente'; end if;
 if not cfg.test_mode and exists(select 1 from public.matchdays where status in ('LOCKED','FINISHED')) then raise exception 'Las cláusulas están cerradas durante la jornada'; end if;
 base_clause := round(player_row.market_value*cfg.clause_base_multiplier);
 clause_amount := least(base_clause+roster_row.clause_protection_amount,round(player_row.market_value*cfg.max_clause_multiplier));
 before_buyer:=buyer.budget; before_seller:=seller.budget; until_at:=now() + make_interval(hours=>cfg.clause_protection_hours);
 delete from public.fantasy_roster_players where fantasy_team_id=seller.id and player_id=target_player;
 insert into public.fantasy_roster_players(fantasy_team_id,league_id,player_id,purchase_price,clause_protection_amount,clause_protected_until) values(buyer.id,buyer.league_id,target_player,clause_amount,0,until_at);
 update public.fantasy_teams set budget=budget-clause_amount where id=buyer.id;
 update public.fantasy_teams set budget=budget+clause_amount*(cfg.clause_seller_percentage/100) where id=seller.id;
 insert into public.fantasy_transactions(fantasy_team_id,player_id,type,amount,balance_before,balance_after,description,metadata,idempotency_key) values(buyer.id,target_player,'CLAUSE_PURCHASE',clause_amount,before_buyer,before_buyer-clause_amount,'Pago de cláusula',jsonb_build_object('sellerId',seller.id,'clauseAmount',clause_amount),idempotency), (seller.id,target_player,'CLAUSE_SALE',clause_amount*(cfg.clause_seller_percentage/100),before_seller,before_seller+clause_amount*(cfg.clause_seller_percentage/100),'Cláusula pagada por otro participante',jsonb_build_object('buyerId',buyer.id,'clauseAmount',clause_amount),idempotency||':seller');
 return query select target_player,seller.id,buyer.id,clause_amount,before_buyer-clause_amount,before_seller+clause_amount*(cfg.clause_seller_percentage/100),until_at;
end $$;
revoke all on function public.pay_player_clause(uuid,text) from public,anon;
grant execute on function public.pay_player_clause(uuid,text) to authenticated;

-- Compatibilidad con el flujo de compra directa del mercado.
create or replace function public.buy_player(target_fantasy_team uuid, target_player uuid)
returns void language plpgsql security definer set search_path='' as $$
declare team_row public.fantasy_teams; player_row public.players; config public.app_config;
begin
 if not public.competition_market_open() then raise exception 'El mercado está cerrado'; end if;
 select * into strict team_row from public.fantasy_teams where id=target_fantasy_team and user_id=auth.uid() for update;
 if not exists(select 1 from public.market_offers where player_id=target_player and week_start=public.competition_market_week()) then raise exception 'El jugador no está en el mercado de esta semana'; end if;
 select * into strict player_row from public.players where id=target_player and status='ACTIVE';
 select * into strict config from public.app_config where id=true;
 if exists(select 1 from public.fantasy_roster_players where player_id=target_player) then raise exception 'El jugador ya pertenece a otra plantilla'; end if;
 if team_row.budget < player_row.market_value then raise exception 'Saldo insuficiente'; end if;
 update public.fantasy_teams set budget=budget-player_row.market_value where id=team_row.id;
 insert into public.fantasy_roster_players(fantasy_team_id,league_id,player_id,purchase_price) values(team_row.id,team_row.league_id,player_row.id,player_row.market_value);
 insert into public.fantasy_transactions(fantasy_team_id,player_id,type,amount) values(team_row.id,player_row.id,'BUY',player_row.market_value);
end $$;
revoke all on function public.buy_player(uuid,uuid) from public,anon;
grant execute on function public.buy_player(uuid,uuid) to authenticated;
