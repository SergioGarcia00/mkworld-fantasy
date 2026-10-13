-- Keep the displayed and charged release clause in sync and restrict clauses to the live market.
create or replace function public.protect_player_clause(target_team uuid,target_player uuid,spend_amount bigint,idempotency text)
returns table(market_value bigint,previous_clause bigint,new_clause bigint,spent bigint,balance_after bigint)
language plpgsql security definer set search_path='' as $$
declare team_row public.fantasy_teams; roster_row public.fantasy_roster_players; player_value bigint; cfg public.app_config; base_clause bigint; increase bigint; before_balance bigint; effective_spend bigint;
begin
 select * into strict team_row from public.fantasy_teams where id=target_team and user_id=auth.uid() for update;
 select * into strict roster_row from public.fantasy_roster_players where fantasy_team_id=target_team and player_id=target_player for update;
 select p.market_value into strict player_value from public.players p where p.id=target_player;
 select * into strict cfg from public.app_config where id=true;
 if spend_amount is null or spend_amount<=0 then raise exception 'El gasto debe ser mayor que cero'; end if;
 if idempotency is not null and exists(select 1 from public.fantasy_transactions where fantasy_team_id=target_team and idempotency_key=idempotency) then
   return query select player_value,round(player_value*cfg.clause_base_multiplier),round(player_value*cfg.clause_base_multiplier)+roster_row.clause_protection_amount,0::bigint,team_row.budget; return;
 end if;
 base_clause:=round(player_value*cfg.clause_base_multiplier);
 effective_spend:=spend_amount;
 if effective_spend>team_row.budget then raise exception 'Saldo insuficiente'; end if;
 increase:=effective_spend*2;
 before_balance:=team_row.budget;
 update public.fantasy_teams set budget=budget-effective_spend where id=team_row.id;
 update public.fantasy_roster_players set clause_protection_amount=clause_protection_amount+increase, clause_protection_spent=clause_protection_spent+effective_spend where fantasy_team_id=target_team and player_id=target_player;
 insert into public.fantasy_transactions(fantasy_team_id,player_id,type,amount,balance_before,balance_after,description,metadata,idempotency_key)
 values(target_team,target_player,'CLAUSE_PROTECTION',effective_spend,before_balance,before_balance-effective_spend,'Protección de cláusula',jsonb_build_object('previousClause',base_clause+roster_row.clause_protection_amount,'protectionCost',effective_spend,'clauseIncrease',increase,'newClause',base_clause+roster_row.clause_protection_amount+increase,'efficiency',2),idempotency);
 return query select player_value,base_clause+roster_row.clause_protection_amount,base_clause+roster_row.clause_protection_amount+increase,effective_spend,before_balance-effective_spend;
end $$;

create or replace function public.pay_player_clause(target_player uuid,idempotency text)
returns table(pilot_id uuid,previous_owner_id uuid,new_owner_id uuid,clause_paid bigint,buyer_balance_after bigint,seller_balance_after bigint,protected_until timestamptz)
language plpgsql security definer set search_path='' as $$
declare buyer public.fantasy_teams; seller public.fantasy_teams; roster_row public.fantasy_roster_players; player_row public.players; cfg public.app_config; clause_amount bigint; base_clause bigint; before_buyer bigint; before_seller bigint; seller_credit bigint; until_at timestamptz;
begin
 if not public.competition_market_open() then raise exception 'El mercado está cerrado'; end if;
 if not exists(select 1 from public.market_offers where player_id=target_player and week_start=public.competition_market_week()) then raise exception 'El jugador no está en el mercado de esta semana'; end if;
 select * into strict buyer from public.fantasy_teams where user_id=auth.uid() for update;
 select * into strict roster_row from public.fantasy_roster_players where player_id=target_player for update;
 select * into strict seller from public.fantasy_teams where id=roster_row.fantasy_team_id for update;
 if buyer.id=seller.id then raise exception 'No puedes pagar tu propia cláusula'; end if;
 if (select count(*) from public.fantasy_roster_players where fantasy_team_id=buyer.id)>=(select squad_size from public.app_config where id=true) then raise exception 'Tu plantilla está completa'; end if;
 select * into strict player_row from public.players where id=target_player;
 select * into strict cfg from public.app_config where id=true;
 if not cfg.test_mode and roster_row.clause_protected_until is not null and roster_row.clause_protected_until>now() then raise exception 'El piloto está protegido temporalmente'; end if;
 base_clause:=round(player_row.market_value*cfg.clause_base_multiplier); clause_amount:=base_clause+roster_row.clause_protection_amount;
 before_buyer:=buyer.budget; before_seller:=seller.budget;
 if before_buyer<clause_amount then raise exception 'Saldo insuficiente'; end if;
 seller_credit:=round(clause_amount*(cfg.clause_seller_percentage/100))::bigint; until_at:=now()+make_interval(hours=>cfg.clause_protection_hours);
 delete from public.fantasy_roster_players where fantasy_team_id=seller.id and player_id=target_player;
 insert into public.fantasy_roster_players(fantasy_team_id,league_id,player_id,purchase_price,clause_protection_amount,clause_protection_spent,clause_protected_until) values(buyer.id,buyer.league_id,target_player,clause_amount,0,0,until_at);
 update public.fantasy_teams set budget=budget-clause_amount where id=buyer.id;
 update public.fantasy_teams set budget=budget+seller_credit where id=seller.id;
 insert into public.fantasy_transactions(fantasy_team_id,player_id,type,amount,balance_before,balance_after,description,metadata,idempotency_key) values(buyer.id,target_player,'CLAUSE_PURCHASE',clause_amount,before_buyer,before_buyer-clause_amount,'Pago de cláusula',jsonb_build_object('sellerId',seller.id,'clauseAmount',clause_amount),idempotency),(seller.id,target_player,'CLAUSE_SALE',seller_credit,before_seller,before_seller+seller_credit,'Cláusula pagada por otro participante',jsonb_build_object('buyerId',buyer.id,'clauseAmount',clause_amount),idempotency||':seller');
 return query select target_player,seller.id,buyer.id,clause_amount,before_buyer-clause_amount,before_seller+seller_credit,until_at;
end $$;
revoke all on function public.protect_player_clause(uuid,uuid,bigint,text) from public,anon;
grant execute on function public.protect_player_clause(uuid,uuid,bigint,text) to authenticated;
revoke all on function public.pay_player_clause(uuid,text) from public,anon;
grant execute on function public.pay_player_clause(uuid,text) to authenticated;
