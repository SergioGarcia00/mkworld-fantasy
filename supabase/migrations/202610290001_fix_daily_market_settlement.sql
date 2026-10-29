-- Fix daily market settlement and the PostgreSQL record-alias failure.
-- Every row alias is explicit (mb/bid_row/offer_row) so no PL/pgSQL record
-- named `b` can be resolved accidentally by the executor or a trigger.
create or replace function public.settle_normal_market(target_week date default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  cfg public.app_config;
  offer_row record;
  bid_row record;
  team_row record;
  second_bid bigint;
  awarded integer := 0;
  market_date date;
  current_date_madrid date := (now() at time zone 'Europe/Madrid')::date;
  close_at timestamptz;
  season uuid;
  latest_date date;
begin
  if not public.is_admin() and coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Solo administradores';
  end if;
  select * into strict cfg from public.app_config where id = true for update;
  if cfg.first_week_mode or cfg.test_mode then return 0; end if;
  select l.season_id into strict season from public.leagues l where l.id = cfg.official_league_id;

  for market_date in
    select distinct mo.week_start from public.market_offers mo
    where mo.season_id = season
      and (target_week is null or mo.week_start = target_week)
      and mo.week_start < current_date_madrid
  loop
    close_at := (market_date + 1)::timestamp at time zone 'Europe/Madrid';
    if now() < close_at then continue; end if;
    for offer_row in
      select mo.* from public.market_offers mo
      where mo.season_id = season and mo.week_start = market_date
      order by mo.slot for update
    loop
      if exists (select 1 from public.market_bid_results mbr where mbr.market_offer_id = offer_row.id) then continue; end if;
      for bid_row in
        select mb.* from public.market_bids mb
        join public.fantasy_teams ft on ft.id = mb.fantasy_team_id
        join public.profiles pr on pr.id = ft.user_id
        where mb.market_offer_id = offer_row.id
          and ft.league_id = cfg.official_league_id
          and coalesce(pr.access_enabled, true)
        order by mb.amount desc, mb.created_at asc, mb.id asc
      loop
        select * into strict team_row from public.fantasy_teams ft where ft.id = bid_row.fantasy_team_id for update;
        if team_row.budget < bid_row.amount or exists (
          select 1 from public.fantasy_roster_players frp
          where frp.league_id = cfg.official_league_id and frp.player_id = offer_row.player_id
        ) then continue; end if;
        select mb2.amount into second_bid from public.market_bids mb2
          where mb2.market_offer_id = offer_row.id and mb2.id <> bid_row.id
          order by mb2.amount desc, mb2.created_at asc, mb2.id asc limit 1;
        update public.fantasy_teams set budget = budget - bid_row.amount where id = team_row.id;
        insert into public.fantasy_roster_players(fantasy_team_id, league_id, player_id, purchase_price)
          values (team_row.id, team_row.league_id, offer_row.player_id, bid_row.amount);
        insert into public.fantasy_transactions(fantasy_team_id, player_id, type, amount, balance_before, balance_after, description, metadata, idempotency_key)
          select team_row.id, offer_row.player_id, 'BUY', bid_row.amount, team_row.budget, team_row.budget - bid_row.amount,
            'Adjudicación automática de puja', jsonb_build_object('marketOfferId', offer_row.id, 'marketDate', market_date), 'normal-market:' || offer_row.id
          where not exists (select 1 from public.fantasy_transactions tx where tx.fantasy_team_id = team_row.id and tx.idempotency_key = 'normal-market:' || offer_row.id);
        insert into public.market_bid_results(market_offer_id, player_id, fantasy_team_id, winning_bid_id, winning_amount, second_amount)
          select offer_row.id, offer_row.player_id, team_row.id, bid_row.id, bid_row.amount, second_bid
          where not exists (select 1 from public.market_bid_results mbr where mbr.market_offer_id = offer_row.id);
        if found then awarded := awarded + 1; end if;
        exit;
      end loop;
    end loop;
  end loop;
  select max(mo.week_start) into latest_date from public.market_offers mo where mo.season_id = season;
  if latest_date is null or latest_date < current_date_madrid then
    perform public.generate_weekly_market(season, current_date_madrid);
  end if;
  return awarded;
end $$;

revoke all on function public.settle_normal_market(date) from public, anon, authenticated;
grant execute on function public.settle_normal_market(date) to service_role;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin perform cron.unschedule('mkworld-normal-market-settlement'); exception when others then null; end;
    begin perform cron.unschedule('mkworld-daily-market'); exception when others then null; end;
    perform cron.schedule('mkworld-daily-market', '*/5 * * * *', 'select public.settle_normal_market(null)');
  end if;
exception when others then null; end $$;
