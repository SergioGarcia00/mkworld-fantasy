-- Manual practice uses the current league; no balances or history are reset.
alter table public.app_config
 add column test_mode boolean not null default false,
 add column test_market_open boolean not null default false,
 add column test_lineup_open boolean not null default false,
 add column test_scores_open boolean not null default false,
 add column test_matchday_id uuid references public.matchdays(id),
 add column test_market_week date;

create function public.competition_market_open() returns boolean
language sql stable security definer set search_path='' as $$
 select case when test_mode then test_market_open else
 extract(isodow from now() at time zone 'Europe/Madrid') <= 5
 and not (extract(isodow from now() at time zone 'Europe/Madrid')=1 and (now() at time zone 'Europe/Madrid')::time < time '01:00')
 and not (extract(isodow from now() at time zone 'Europe/Madrid')=5 and (now() at time zone 'Europe/Madrid')::time >= time '23:59') end
 from public.app_config where id=true;
$$;
create function public.competition_market_week() returns date
language sql stable security definer set search_path='' as $$
 select case when test_mode then test_market_week else date_trunc('week',now() at time zone 'Europe/Madrid')::date end from public.app_config where id=true;
$$;
revoke all on function public.competition_market_open(),public.competition_market_week() from public;
grant execute on function public.competition_market_open(),public.competition_market_week() to anon,authenticated,service_role;

create function public.admin_test_controls(enabled boolean, market_open boolean, lineup_open boolean, scores_open boolean, target_matchday uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Solo administradores'; end if;
 perform 1 from public.app_config where id=true for update;
 if enabled and not exists(select 1 from public.matchdays m join public.leagues l on l.season_id=m.season_id join public.app_config c on c.official_league_id=l.id where m.id=target_matchday and m.status<>'FINISHED') then raise exception 'Selecciona una jornada sin finalizar de la liga actual'; end if;
 update public.app_config set test_mode=enabled,test_market_open=market_open,test_lineup_open=lineup_open,test_scores_open=scores_open,test_matchday_id=target_matchday,
 test_market_week=coalesce(test_market_week,date_trunc('week',now() at time zone 'Europe/Madrid')::date) where id=true;
end $$;
revoke all on function public.admin_test_controls(boolean,boolean,boolean,boolean,uuid) from public,anon;
grant execute on function public.admin_test_controls(boolean,boolean,boolean,boolean,uuid) to authenticated;

create function public.admin_create_test_matchday(day_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare season uuid; created uuid;
begin
 if not public.is_admin() then raise exception 'Solo administradores'; end if;
 perform 1 from public.app_config where id=true for update;
 if length(btrim(day_name)) not between 1 and 100 then raise exception 'Nombre inválido'; end if;
 select l.season_id into strict season from public.leagues l join public.app_config c on c.official_league_id=l.id;
 insert into public.matchdays(season_id,number,name,status,lock_at,start_at,end_at)
 select season,coalesce(max(number),0)+1,btrim(day_name),'UPCOMING',now(),now(),now()+interval '1 day' from public.matchdays where season_id=season returning id into created;
 return created;
end $$;
revoke all on function public.admin_create_test_matchday(text) from public,anon;
grant execute on function public.admin_create_test_matchday(text) to authenticated;

create or replace function public.save_lineup(target_team uuid, target_matchday uuid, starters uuid[], captain uuid)
returns void language plpgsql security definer set search_path='' as $$
declare saved_lineup_id uuid; owned_count integer;
begin
 if not exists(select 1 from public.fantasy_teams where id=target_team and user_id=auth.uid()) then raise exception 'Equipo no autorizado'; end if;
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
 delete from public.fantasy_lineup_players flp where flp.lineup_id=saved_lineup_id;
 insert into public.fantasy_lineup_players(lineup_id,player_id,real_team_id,player_name,is_starter,is_captain)
 select saved_lineup_id,r.player_id,p.team_id,p.name,true,r.player_id=captain from public.fantasy_roster_players r join public.players p on p.id=r.player_id where r.fantasy_team_id=target_team and r.player_id=any(starters);
end $$;
create or replace function public.submit_player_weekly_score(target_team uuid,target_matchday uuid,target_player uuid,first_game integer,second_game integer default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.fantasy_teams where id=target_team and user_id=auth.uid()) then raise exception 'Equipo no autorizado'; end if;
 if (select test_mode from public.app_config where id=true) then
 if not exists(select 1 from public.app_config c join public.matchdays m on m.id=c.test_matchday_id where c.id=true and c.test_scores_open and m.id=target_matchday and m.status<>'FINISHED') then raise exception 'Envío de puntos cerrado por administración'; end if;
 else
 if exists(select 1 from public.matchdays where id=target_matchday and status in ('LOCKED','FINISHED')) then raise exception 'La jornada está cerrada'; end if;
 end if;
 if not exists(select 1 from public.fantasy_roster_players where fantasy_team_id=target_team and player_id=target_player) then raise exception 'El jugador no pertenece a tu plantilla'; end if;
 insert into public.player_weekly_inputs(fantasy_team_id,player_id,matchday_id,game_one,game_two) values(target_team,target_player,target_matchday,first_game,second_game)
 on conflict(fantasy_team_id,player_id,matchday_id) do update set game_one=excluded.game_one,game_two=excluded.game_two,submitted_at=now();
end $$;
create or replace function public.auto_close_matchday_when_complete()
returns trigger language plpgsql security definer set search_path='' as $$
declare total_teams integer; complete_teams integer; match_status public.matchday_status;
begin
 if (select test_mode from public.app_config where id=true) then return new; end if;
 select status into match_status from public.matchdays where id=new.matchday_id for update;
 if match_status <> 'OPEN' then return new; end if;
 select count(*) into total_teams from public.fantasy_teams;
 select count(*) into complete_teams
 from public.fantasy_teams ft
 where exists(select 1 from public.fantasy_lineups l where l.fantasy_team_id=ft.id and l.matchday_id=new.matchday_id)
 and (select count(*) from public.fantasy_lineup_players lp join public.player_weekly_inputs i on i.player_id=lp.player_id and i.fantasy_team_id=ft.id and i.matchday_id=new.matchday_id where lp.lineup_id=(select l2.id from public.fantasy_lineups l2 where l2.fantasy_team_id=ft.id and l2.matchday_id=new.matchday_id limit 1) and lp.is_starter and i.game_one is not null and i.game_two is not null)=6;
 if total_teams > 0 and complete_teams = total_teams then
   update public.matchdays set status='FINISHED' where id=new.matchday_id and status='OPEN';
   -- Rewards and market values are deliberately finalized by the admin flow;
   -- this trigger only closes score entry once every lineup is complete.
 end if;
 return new;
end $$;
create or replace function public.place_market_bid(target_team uuid, target_player uuid, bid_amount bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  team_row public.fantasy_teams;
  offer_row public.market_offers;
  player_row public.players;
begin
 perform 1 from public.app_config where id=true for share;
 if not public.competition_market_open() then raise exception 'El mercado está cerrado'; end if;
  select * into strict team_row from public.fantasy_teams where id = target_team and user_id = auth.uid();
  select * into strict offer_row from public.market_offers where player_id = target_player and week_start = public.competition_market_week();
  if exists(select 1 from public.market_bid_results where market_offer_id=offer_row.id) then raise exception 'Oferta ya adjudicada'; end if;
  select * into strict player_row from public.players where id = target_player;
  if bid_amount < player_row.initial_value then raise exception 'La puja mínima es el valor base del piloto'; end if;
  if bid_amount > team_row.budget then raise exception 'La puja supera tu presupuesto'; end if;
  if exists (select 1 from public.fantasy_roster_players where fantasy_team_id = team_row.id and player_id = target_player) then
    raise exception 'El piloto ya está en tu plantilla';
  end if;
  insert into public.market_bids(market_offer_id,fantasy_team_id,player_id,week_start,amount)
  values(offer_row.id, team_row.id, target_player, offer_row.week_start, bid_amount)
  on conflict (market_offer_id, fantasy_team_id) do update set amount=excluded.amount, updated_at=now();
end $$;
revoke all on function public.place_market_bid(uuid,uuid,bigint) from public,anon;

create or replace function public.sell_player(target_fantasy_team uuid, target_player uuid)
returns void language plpgsql security definer set search_path='' as $$
declare team_row public.fantasy_teams; roster_row public.fantasy_roster_players; player_value bigint; sale_price bigint; before_balance bigint; config_row public.app_config;
begin
 if not public.competition_market_open() then raise exception 'El mercado está cerrado'; end if;
 select * into strict team_row from public.fantasy_teams where id=target_fantasy_team and user_id=auth.uid() for update;
 select * into strict roster_row from public.fantasy_roster_players where fantasy_team_id=team_row.id and player_id=target_player for update;
 select market_value into strict player_value from public.players where id=target_player;
 select * into strict config_row from public.app_config where id=true;
 sale_price := floor(player_value * config_row.market_sell_percentage / 100);
 before_balance := team_row.budget;
 delete from public.fantasy_roster_players where fantasy_team_id=team_row.id and player_id=target_player;
 update public.fantasy_teams set budget=budget+sale_price where id=team_row.id;
 insert into public.fantasy_transactions(fantasy_team_id,player_id,type,amount,balance_before,balance_after,description,metadata,idempotency_key)
 values(team_row.id,target_player,'PILOT_MARKET_SALE',sale_price,before_balance,before_balance+sale_price,'Venta inmediata al mercado',jsonb_build_object('marketValue',player_value,'sellPercentage',config_row.market_sell_percentage,'salePrice',sale_price), 'sale:'||target_player::text);
end $$;
create or replace function public.buy_player(target_fantasy_team uuid, target_player uuid)
returns void language plpgsql security definer set search_path='' as $$
declare team_row public.fantasy_teams; player_row public.players; config public.app_config;
begin
 if not public.competition_market_open() then raise exception 'El mercado está cerrado'; end if;
 select * into strict team_row from public.fantasy_teams where id=target_fantasy_team and user_id=auth.uid() for update;
 if not exists(select 1 from public.market_offers where player_id=target_player and week_start=public.competition_market_week()) then raise exception 'El jugador no está en el mercado de esta semana'; end if;
 select * into strict player_row from public.players where id=target_player and status='ACTIVE';
 select * into strict config from public.app_config where id=true;
 if (select count(*) from public.fantasy_roster_players where fantasy_team_id=team_row.id) >= config.squad_size then raise exception 'La plantilla ya tiene 10 jugadores'; end if;
 if exists(select 1 from public.fantasy_roster_players where player_id=target_player) then raise exception 'El jugador ya pertenece a otra plantilla'; end if;
 if team_row.budget < player_row.market_value then raise exception 'Presupuesto insuficiente'; end if;
 update public.fantasy_teams set budget=budget-player_row.market_value where id=team_row.id;
 insert into public.fantasy_roster_players(fantasy_team_id,league_id,player_id,purchase_price) values(team_row.id,team_row.league_id,player_row.id,player_row.market_value);
 insert into public.fantasy_transactions(fantasy_team_id,player_id,type,amount) values(team_row.id,player_row.id,'BUY',player_row.market_value);
end $$;
create or replace function public.pay_player_clause(target_player uuid,idempotency text)
returns table(pilot_id uuid,previous_owner_id uuid,new_owner_id uuid,clause_paid bigint,buyer_balance_after bigint,seller_balance_after bigint,protected_until timestamptz)
language plpgsql security definer set search_path='' as $$
declare buyer public.fantasy_teams; seller public.fantasy_teams; roster_row public.fantasy_roster_players; player_row public.players; cfg public.app_config; clause_amount bigint; base_clause bigint; before_buyer bigint; before_seller bigint; until_at timestamptz;
begin
 if (select test_mode and not test_market_open from public.app_config where id=true) then raise exception 'El mercado está cerrado'; end if;
 select * into strict buyer from public.fantasy_teams where user_id=auth.uid() for update;
 select * into strict roster_row from public.fantasy_roster_players where player_id=target_player for update;
 select * into strict seller from public.fantasy_teams where id=roster_row.fantasy_team_id for update;
 if buyer.id=seller.id then raise exception 'No puedes pagar tu propia cláusula'; end if;
 if (select count(*) from public.fantasy_roster_players where fantasy_team_id=buyer.id) >= (select squad_size from public.app_config where id=true) then raise exception 'Tu plantilla está completa'; end if;
 select * into strict player_row from public.players where id=target_player;
 select * into strict cfg from public.app_config where id=true;
 if not cfg.test_mode and roster_row.clause_protected_until is not null and roster_row.clause_protected_until > now() then raise exception 'El piloto está protegido temporalmente'; end if;
 if not cfg.test_mode and exists(select 1 from public.matchdays where status in ('LOCKED','FINISHED')) then raise exception 'Las cláusulas están cerradas durante la jornada'; end if;
 base_clause := round(player_row.market_value*cfg.clause_base_multiplier);
 clause_amount := least(base_clause+roster_row.clause_protection_amount,round(player_row.market_value*cfg.max_clause_multiplier));
 if buyer.budget < clause_amount then raise exception 'Saldo insuficiente para pagar la cláusula'; end if;
 before_buyer:=buyer.budget; before_seller:=seller.budget; until_at:=now() + make_interval(hours=>cfg.clause_protection_hours);
 delete from public.fantasy_roster_players where fantasy_team_id=seller.id and player_id=target_player;
 insert into public.fantasy_roster_players(fantasy_team_id,league_id,player_id,purchase_price,clause_protection_amount,clause_protected_until) values(buyer.id,buyer.league_id,target_player,clause_amount,0,until_at);
 update public.fantasy_teams set budget=budget-clause_amount where id=buyer.id;
 update public.fantasy_teams set budget=budget+clause_amount*(cfg.clause_seller_percentage/100) where id=seller.id;
 insert into public.fantasy_transactions(fantasy_team_id,player_id,type,amount,balance_before,balance_after,description,metadata,idempotency_key) values(buyer.id,target_player,'CLAUSE_PURCHASE',clause_amount,before_buyer,before_buyer-clause_amount,'Pago de cláusula',jsonb_build_object('sellerId',seller.id,'clauseAmount',clause_amount),idempotency), (seller.id,target_player,'CLAUSE_SALE',clause_amount*(cfg.clause_seller_percentage/100),before_seller,before_seller+clause_amount*(cfg.clause_seller_percentage/100),'Cláusula pagada por otro participante',jsonb_build_object('buyerId',buyer.id,'clauseAmount',clause_amount),idempotency||':seller');
 return query select target_player,seller.id,buyer.id,clause_amount,before_buyer-clause_amount,before_seller+clause_amount*(cfg.clause_seller_percentage/100),until_at;
end $$;
create or replace function public.generate_weekly_market(target_season uuid, target_week date default null)
returns integer language plpgsql security definer set search_path='' as $$
declare week_date date := coalesce(target_week, date_trunc('week', now() at time zone 'Europe/Madrid')::date);
begin
 -- Scheduled calls supply NULL. Manual mode freezes the market until an admin generates it.
 if (select test_mode from public.app_config where id=true) and target_week is null then return 0; end if;
 delete from public.market_offers where season_id=target_season and week_start=week_date;
 with high as (select id,mmr,row_number() over(order by random()) slot from public.players where mmr>9000 and status='ACTIVE' order by random() limit 2),
 mid as (select id,mmr,row_number() over(order by random())+2 slot from public.players where mmr between 4000 and 5000 and status='ACTIVE' order by random() limit 6),
 low as (select id,mmr,9 slot from public.players where mmr<4000 and status='ACTIVE' and team_id not in (select id from public.teams where lower(name)='code genius') order by random() limit 1),
 code as (select p.id,p.mmr,10 slot from public.players p join public.teams t on t.id=p.team_id where lower(t.name)='code genius' and p.status='ACTIVE' order by random() limit 1), picks as (select * from high union all select * from mid union all select * from low union all select * from code)
 insert into public.market_offers(season_id,week_start,slot,player_id,mmr) select target_season,week_date,slot,id,mmr from picks;
 return (select count(*) from public.market_offers where season_id=target_season and week_start=week_date);
end $$;
create or replace function public.publish_market_winner_news(target_week date)
returns integer language plpgsql security definer set search_path = '' as $$
declare added integer := 0;
begin
 if (select test_mode from public.app_config where id=true) then return 0; end if;
  if now() < ((target_week + 4)::timestamp at time zone 'Europe/Madrid') + interval '23 hours 59 minutes 59 seconds' then return 0; end if;
  with ranked as (
    select b.*, row_number() over (partition by b.market_offer_id order by b.amount desc,b.created_at asc,b.id asc) as rank
    from public.market_bids b where b.week_start=target_week
  ), winners as (
    insert into public.market_bid_results(market_offer_id,player_id,fantasy_team_id,winning_bid_id,winning_amount,second_amount)
    select r.market_offer_id,r.player_id,r.fantasy_team_id,r.id,r.amount,
      (select r2.amount from ranked r2 where r2.market_offer_id=r.market_offer_id and r2.rank=2)
    from ranked r where r.rank=1
    on conflict (market_offer_id) do update set winning_amount=excluded.winning_amount,second_amount=excluded.second_amount where public.market_bid_results.winning_amount is null
    returning player_id,fantasy_team_id,winning_amount,second_amount
  )
  insert into public.news_posts(title,body,category,published)
  select left('Mercado cerrado · '||p.name,140),
    'Ganador: '||pr.display_name||' · Precio ganador: '||to_char(w.winning_amount,'FM999G999G999G990')||' € · Segunda puja: '||coalesce(to_char(w.second_amount,'FM999G999G999G990')||' €','Sin segunda puja')||'.',
    'Mercado',true
  from winners w join public.players p on p.id=w.player_id join public.fantasy_teams ft on ft.id=w.fantasy_team_id join public.profiles pr on pr.id=ft.user_id;
  get diagnostics added=row_count; return added;
end $$;
-- Direct table writes must obey the same manual gates as the participant RPCs.
create function public.guard_test_input() returns trigger language plpgsql security definer set search_path='' as $$
declare c public.app_config;
begin
 select * into strict c from public.app_config where id=true;
 if c.test_mode and not public.is_admin() and (new.matchday_id is distinct from c.test_matchday_id or not c.test_scores_open or exists(select 1 from public.matchdays where id=new.matchday_id and status='FINISHED')) then raise exception 'Envío de puntos cerrado por administración'; end if;
 return new;
end $$;
create trigger guard_test_input before insert or update on public.player_weekly_inputs for each row execute function public.guard_test_input();
revoke all on function public.guard_test_input() from public,anon,authenticated;

-- Manual market rounds use a stable internal week key, never the wall clock.
create function public.admin_test_new_market() returns integer
language plpgsql security definer set search_path='' as $$
declare cfg public.app_config; season uuid; next_week date; count_offers integer;
begin
 if not public.is_admin() then raise exception 'Solo administradores'; end if;
 select * into strict cfg from public.app_config where id=true for update;
 if not cfg.test_mode then raise exception 'Activa primero el modo de pruebas'; end if;
 select season_id into strict season from public.leagues where id=cfg.official_league_id;
 select greatest(cfg.test_market_week,coalesce(max(week_start),cfg.test_market_week))+7 into next_week from public.market_offers where season_id=season;
 count_offers:=public.generate_weekly_market(season,next_week);
 if count_offers=0 then raise exception 'No hay pilotos disponibles para generar ofertas'; end if;
 update public.app_config set test_market_week=next_week,test_market_open=true where id=true;
 return count_offers;
end $$;
revoke all on function public.admin_test_new_market() from public,anon;
grant execute on function public.admin_test_new_market() to authenticated;

create function public.admin_test_settle_market() returns integer
language plpgsql security definer set search_path='' as $$
declare cfg public.app_config; offer record; bid record; ft public.fantasy_teams; awarded integer:=0; second_bid bigint;
begin
 if not public.is_admin() then raise exception 'Solo administradores'; end if;
 select * into strict cfg from public.app_config where id=true for update;
 if not cfg.test_mode then raise exception 'Activa primero el modo de pruebas'; end if;
 update public.app_config set test_market_open=false where id=true;
 -- Stable order and row locks make budget allocation and repeated settlement deterministic.
 for offer in select o.* from public.market_offers o join public.leagues l on l.season_id=o.season_id where l.id=cfg.official_league_id and o.week_start=cfg.test_market_week order by o.slot for update of o loop
  if exists(select 1 from public.market_bid_results where market_offer_id=offer.id) then continue; end if;
  if exists(select 1 from public.fantasy_roster_players where league_id=cfg.official_league_id and player_id=offer.player_id) then continue; end if;
  for bid in select b.* from public.market_bids b join public.fantasy_teams t on t.id=b.fantasy_team_id join public.profiles p on p.id=t.user_id where b.market_offer_id=offer.id and t.league_id=cfg.official_league_id and p.access_enabled order by b.amount desc,b.created_at,b.id loop
   select * into strict ft from public.fantasy_teams where id=bid.fantasy_team_id for update;
   if ft.budget<bid.amount or (select count(*) from public.fantasy_roster_players where fantasy_team_id=ft.id)>=cfg.squad_size then continue; end if;
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
 return awarded;
end $$;
revoke all on function public.admin_test_settle_market() from public,anon;
grant execute on function public.admin_test_settle_market() to authenticated;

-- Qualify the scoring-rule id so manual calculation and finalization work.
create or replace function public.calculate_matchday_scores(target_matchday uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare lineup record; total numeric; processed integer:=0; rule_id uuid;
begin
 select sr.id into rule_id from public.scoring_rules sr join public.matchdays md on md.season_id=sr.season_id where md.id=target_matchday order by sr.version desc limit 1;
 for lineup in select l.id,l.fantasy_team_id,l.captain_multiplier from public.fantasy_lineups l where l.matchday_id=target_matchday loop
  select coalesce(sum((i.game_one+coalesce(i.game_two,0)) * case when lp.is_captain then lineup.captain_multiplier else 1 end),0) into total
  from public.fantasy_lineup_players lp join public.player_weekly_inputs i on i.player_id=lp.player_id and i.fantasy_team_id=lineup.fantasy_team_id and i.matchday_id=target_matchday where lp.lineup_id=lineup.id and lp.is_starter;
  insert into public.fantasy_team_matchday_scores(fantasy_team_id,matchday_id,points,scoring_rule_id) values(lineup.fantasy_team_id,target_matchday,total,rule_id)
  on conflict(fantasy_team_id,matchday_id) do update set points=excluded.points,processed_at=now(); processed:=processed+1;
 end loop;
 return processed;
end $$;

create or replace function public.admin_set_matchday_status(target_matchday uuid,new_status public.matchday_status)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Solo administradores'; end if;
 perform 1 from public.app_config where id=true for update;
 if (select test_mode from public.app_config where id=true) and new_status<>'FINISHED' and exists(select 1 from public.matchdays where id=target_matchday and status='FINISHED') then raise exception 'Crea otra jornada de pruebas para conservar las recompensas ya calculadas'; end if;
 update public.matchdays set status=new_status where id=target_matchday;
 if not found then raise exception 'Jornada no encontrada'; end if;
 update public.app_config set test_lineup_open=(new_status='OPEN'),test_scores_open=(new_status='OPEN') where id=true and test_mode and test_matchday_id=target_matchday;
 if new_status='FINISHED' then
   perform public.finalize_round_economy(target_matchday);
   perform public.update_pilot_market_values(target_matchday);
 end if;
end $$;

create or replace function public.admin_start_test_matchday(target_matchday uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.admin_test_controls(true,false,true,true,target_matchday);
end $$;
-- Jornada rewards belong to a fantasy team, not to an individual pilot.
alter table public.fantasy_transactions alter column player_id drop not null;
