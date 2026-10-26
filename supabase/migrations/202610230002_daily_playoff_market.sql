-- Daily playoff market. The existing market_offers.week_start column is kept
-- for compatibility, but stores the Madrid calendar date of the shop.

create or replace function public.competition_market_week()
returns date language sql stable security definer set search_path = '' as $$
  select case when first_week_mode then first_week_market_date
    when test_mode then test_market_week
    else (now() at time zone 'Europe/Madrid')::date end
  from public.app_config where id = true;
$$;

create or replace function public.competition_market_open()
returns boolean language sql stable security definer set search_path = '' as $$
  select case when first_week_mode then first_week_market_open
    when test_mode then test_market_open
    else (now() at time zone 'Europe/Madrid')::time >= time '01:00'
         and (now() at time zone 'Europe/Madrid')::time < time '23:59'
  end from public.app_config where id = true;
$$;

create or replace function public.generate_weekly_market(target_season uuid, target_week date default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  market_date date := coalesce(target_week, (now() at time zone 'Europe/Madrid')::date);
  playoff_teams text[] := array[
    'Rozando la Katástrofe','Clarity','Lycoris','Leftovers','brilliant','Leaf Bloom',
    'Crazy Dave Racing','Battle Alliance','Solar Storm','Dynamite','Stellar Roses','Urumyans',
    'Cool Kids','Astroblitz','Jackpot','Excalibur','Unbelievably Bailed','The Squirrel Squad',
    'Starstruck 2','Nferno Violet','Kartvengers Team Alpha','Pixel Racers','Ronrons 2','Caliburn',
    'Liberty','Archon Accelerators','Acceleration','Rozando la Katástrofe Exodus','STAKATAKA',
    'Tempest','Segundones Team','Midnight Wasps','Solarblitz','Yoshi Family Safari',
    'Shy Guys Gambling Club','KartsRapaces Blues','Prime 6','RKU','Koopa Troopers','Cyneria Esport',
    'La Hoop','The Acorn Academy','KARTNIVOROS','RK Amborgesa','Capybara Skies','Ignition',
    'Pixel Academy','Diamond Justice','Volt Switch','Knights of Wheels','Jet Joker Neo',
    'Trial Chambers Perle','Rozando la Katástrofe Eclipse','Real Calabacín','Space Dementia'
  ];
begin
  delete from public.market_offers where season_id = target_season and week_start = market_date;
  with eligible as (
    select distinct on (p.team_id) p.id, p.team_id, p.mmr
    from public.players p join public.teams t on t.id = p.team_id
    where p.status = 'ACTIVE' and p.mmr is not null and trim(t.name) = any(playoff_teams)
    order by p.team_id, random()
  ), picks as (
    select id, mmr, row_number() over(order by random())::integer slot
    from eligible order by random() limit 10
  )
  insert into public.market_offers(season_id, week_start, slot, player_id, mmr)
  select target_season, market_date, slot, id, mmr from picks;
  return (select count(*) from public.market_offers where season_id = target_season and week_start = market_date);
end $$;

create or replace function public.settle_normal_market(target_week date default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare cfg public.app_config; offer record; bid record; team_row record; second_bid bigint;
  awarded integer := 0; market_date date; current_date_madrid date; close_at timestamptz; season uuid; latest_date date;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then raise exception 'Solo administradores'; end if;
  select * into strict cfg from public.app_config where id = true for update;
  if cfg.first_week_mode or cfg.test_mode then return 0; end if;
  select season_id into strict season from public.leagues where id = cfg.official_league_id;
  current_date_madrid := (now() at time zone 'Europe/Madrid')::date;
  for market_date in select distinct o.week_start from public.market_offers o where o.season_id=season and (target_week is null or o.week_start=target_week) and o.week_start < current_date_madrid loop
    close_at := (market_date + 1)::timestamp at time zone 'Europe/Madrid';
    if now() < close_at then continue; end if;
    for offer in select o.* from public.market_offers o where o.season_id=season and o.week_start=market_date order by o.slot for update loop
      if exists(select 1 from public.market_bid_results r where r.market_offer_id=offer.id) then continue; end if;
      for bid in select mb.* from public.market_bids mb join public.fantasy_teams t on t.id=mb.fantasy_team_id join public.profiles p on p.id=t.user_id where mb.market_offer_id=offer.id and t.league_id=cfg.official_league_id and coalesce(p.access_enabled,true) order by mb.amount desc,mb.created_at asc,mb.id asc loop
        select * into strict team_row from public.fantasy_teams where id=bid.fantasy_team_id for update;
        if team_row.budget < bid.amount or exists(select 1 from public.fantasy_roster_players r where r.league_id=cfg.official_league_id and r.player_id=offer.player_id) then continue; end if;
        select b2.amount into second_bid from public.market_bids b2 where b2.market_offer_id=offer.id and b2.id<>bid.id order by b2.amount desc,b2.created_at asc,b2.id asc limit 1;
        update public.fantasy_teams set budget=budget-bid.amount where id=team_row.id;
        insert into public.fantasy_roster_players(fantasy_team_id,league_id,player_id,purchase_price) values(team_row.id,team_row.league_id,offer.player_id,bid.amount);
        insert into public.fantasy_transactions(fantasy_team_id,player_id,type,amount,balance_before,balance_after,description,metadata,idempotency_key) values(team_row.id,offer.player_id,'BUY',bid.amount,team_row.budget,team_row.budget-bid.amount,'Adjudicación automática de puja',jsonb_build_object('marketOfferId',offer.id,'marketDate',market_date),'normal-market:'||offer.id);
        insert into public.market_bid_results(market_offer_id,player_id,fantasy_team_id,winning_bid_id,winning_amount,second_amount) values(offer.id,offer.player_id,team_row.id,bid.id,bid.amount,second_bid);
        awarded:=awarded+1; exit;
      end loop;
    end loop;
  end loop;
  select max(o.week_start) into latest_date from public.market_offers o where o.season_id=season;
  if latest_date is null or latest_date < current_date_madrid then perform public.generate_weekly_market(season,current_date_madrid); end if;
  return awarded;
end $$;

do $$ begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    begin perform cron.unschedule('mkworld-normal-market-settlement'); exception when others then null; end;
    begin perform cron.unschedule('mkworld-daily-market'); exception when others then null; end;
    perform cron.schedule('mkworld-daily-market','*/5 * * * *','select public.settle_normal_market(null)');
  end if;
exception when others then null; end $$;
