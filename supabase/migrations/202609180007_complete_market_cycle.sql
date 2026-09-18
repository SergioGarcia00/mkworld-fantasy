-- Completa el ciclo manual del mercado: adjudica, publica las noticias y
-- deja abierta la siguiente ronda sin borrar una tienda que ya estuviera preparada.
create or replace function public.admin_test_settle_market() returns integer
language plpgsql security definer set search_path='' as $$
declare cfg public.app_config; offer record; bid record; ft public.fantasy_teams; awarded integer:=0; second_bid bigint; next_offers integer;
begin
 if not public.is_admin() then raise exception 'Solo administradores'; end if;
 select * into strict cfg from public.app_config where id=true for update;
 if not cfg.test_mode then raise exception 'Activa primero el modo de pruebas'; end if;
 update public.app_config set test_market_open=false where id=true;
 for offer in select o.* from public.market_offers o join public.leagues l on l.season_id=o.season_id where l.id=cfg.official_league_id and o.week_start=cfg.test_market_week order by o.slot for update of o loop
  if exists(select 1 from public.market_bid_results where market_offer_id=offer.id) then continue; end if;
  for bid in select b.* from public.market_bids b join public.fantasy_teams t on t.id=b.fantasy_team_id join public.profiles p on p.id=t.user_id where b.market_offer_id=offer.id and t.league_id=cfg.official_league_id and p.access_enabled order by b.amount desc,b.created_at,b.id loop
   select * into strict ft from public.fantasy_teams where id=bid.fantasy_team_id for update;
   if ft.budget<bid.amount then continue; end if;
   update public.fantasy_teams set budget=budget-bid.amount where id=ft.id;
   insert into public.fantasy_roster_players(fantasy_team_id,league_id,player_id,purchase_price) values(ft.id,ft.league_id,offer.player_id,bid.amount);
   insert into public.fantasy_transactions(fantasy_team_id,player_id,type,amount,balance_before,balance_after,description,idempotency_key)
   values(ft.id,offer.player_id,'BUY',bid.amount,ft.budget,ft.budget-bid.amount,'Adjudicación de puja · pruebas','test-bid:'||offer.id);
   select amount into second_bid from public.market_bids where market_offer_id=offer.id and id<>bid.id order by amount desc,created_at,id limit 1;
   insert into public.market_bid_results(market_offer_id,player_id,fantasy_team_id,winning_bid_id,winning_amount,second_amount) values(offer.id,offer.player_id,ft.id,bid.id,bid.amount,second_bid);
   awarded:=awarded+1;
   exit;
  end loop;
 end loop;
 -- Generar la siguiente ronda después de adjudicar, manteniendo la clave de
 -- semana estable y permitiendo plantillas temporales de más de 10 jugadores.
 next_offers:=public.admin_test_new_market();
 return awarded;
end $$;
revoke all on function public.admin_test_settle_market() from public,anon;
grant execute on function public.admin_test_settle_market() to authenticated;

create or replace function public.admin_first_week_settle(target_day date)
returns integer language plpgsql security definer set search_path='' as $$
declare cfg public.app_config; offer record; bid record; ft record; awarded integer:=0; next_day date; next_count integer;
begin
  if not public.is_admin() and auth.role()<>'service_role' then raise exception 'Solo administradores'; end if;
  select * into strict cfg from public.app_config where id=true for update;
  for offer in select o.* from public.market_offers o where o.week_start=target_day and o.season_id=(select season_id from public.leagues where id=cfg.official_league_id) order by o.slot for update loop
    if exists(select 1 from public.market_bid_results where market_offer_id=offer.id) then continue; end if;
    for bid in select b.* from public.market_bids b join public.fantasy_teams t on t.id=b.fantasy_team_id where b.market_offer_id=offer.id and t.league_id=cfg.official_league_id order by b.amount desc,b.created_at,b.id loop
      select * into strict ft from public.fantasy_teams where id=bid.fantasy_team_id for update;
      if exists(select 1 from public.fantasy_roster_players where league_id=cfg.official_league_id and player_id=offer.player_id) or ft.budget<bid.amount then continue; end if;
      update public.fantasy_teams set budget=budget-bid.amount where id=ft.id;
      insert into public.fantasy_roster_players(fantasy_team_id,league_id,player_id,purchase_price) values(ft.id,ft.league_id,offer.player_id,bid.amount);
      insert into public.fantasy_transactions(fantasy_team_id,player_id,type,amount,description,idempotency_key) values(ft.id,offer.player_id,'BUY',bid.amount,'Adjudicación de subasta · primera semana','first-week-auction:'||offer.id);
      insert into public.market_bid_results(market_offer_id,player_id,fantasy_team_id,winning_bid_id,winning_amount) values(offer.id,offer.player_id,ft.id,bid.id,bid.amount);
      awarded:=awarded+1; exit;
    end loop;
  end loop;
  update public.app_config set first_week_market_open=false,test_market_open=false where id=true and first_week_market_date=target_day;
  next_day:=target_day+1;
  if cfg.first_week_mode and next_day<=date '2026-09-20' then
    select count(*) into next_count from public.market_offers where season_id=(select season_id from public.leagues where id=cfg.official_league_id) and week_start=next_day;
    if next_count=0 then
      perform public.admin_first_week_shop(next_day);
    else
      update public.app_config set first_week_market_date=next_day,test_market_week=next_day,first_week_market_open=true,test_market_open=true where id=true;
    end if;
  end if;
  return awarded;
end $$;
revoke all on function public.admin_first_week_settle(date) from public,anon;
grant execute on function public.admin_first_week_settle(date) to authenticated;
