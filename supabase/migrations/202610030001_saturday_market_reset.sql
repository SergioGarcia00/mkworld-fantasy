-- Normal market schedule: open Monday at 01:00 and close Saturday at 01:00
-- in Europe/Madrid. At close, settle the finished week and prepare the next
-- week's offers so the market is ready without an admin opening the site.

create or replace function public.competition_market_week()
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when first_week_mode then first_week_market_date
    when test_mode then test_market_week
    else date_trunc('week', now() at time zone 'Europe/Madrid')::date
      + case
          when extract(isodow from now() at time zone 'Europe/Madrid') >= 6 then 7
          else 0
        end
  end
  from public.app_config
  where id = true;
$$;

create or replace function public.competition_market_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when first_week_mode then first_week_market_open
    when test_mode then test_market_open
    else extract(isodow from now() at time zone 'Europe/Madrid') between 1 and 6
      and not (
        extract(isodow from now() at time zone 'Europe/Madrid') = 1
        and (now() at time zone 'Europe/Madrid')::time < time '01:00'
      )
      and not (
        extract(isodow from now() at time zone 'Europe/Madrid') = 6
        and (now() at time zone 'Europe/Madrid')::time >= time '01:00'
      )
  end
  from public.app_config
  where id = true;
$$;

revoke all on function public.competition_market_open() from public;
grant execute on function public.competition_market_open() to anon, authenticated, service_role;
revoke all on function public.competition_market_week() from public;
grant execute on function public.competition_market_week() to anon, authenticated, service_role;

create or replace function public.settle_normal_market(target_week date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  cfg public.app_config;
  offer record;
  bid record;
  team_row record;
  second_bid bigint;
  awarded integer := 0;
  week_row date;
  current_week date;
  close_at timestamptz;
  season uuid;
  latest_week date;
  next_week date;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Solo administradores';
  end if;

  select * into strict cfg
  from public.app_config
  where id = true
  for update;

  if cfg.first_week_mode or cfg.test_mode then
    return 0;
  end if;

  select season_id into strict season
  from public.leagues
  where id = cfg.official_league_id;

  current_week := date_trunc('week', now() at time zone 'Europe/Madrid')::date;

  for week_row in
    select distinct o.week_start
    from public.market_offers o
    where o.season_id = season
      and (target_week is null or o.week_start = target_week)
      and o.week_start <= current_week
  loop
    close_at := ((week_row + 5)::timestamp + time '01:00:00') at time zone 'Europe/Madrid';
    if now() < close_at then
      continue;
    end if;

    for offer in
      select o.*
      from public.market_offers o
      where o.season_id = season
        and o.week_start = week_row
      order by o.slot
      for update
    loop
      if exists (
        select 1
        from public.market_bid_results r
        where r.market_offer_id = offer.id
      ) then
        continue;
      end if;

      for bid in
        select b.*
        from public.market_bids b
        join public.fantasy_teams t on t.id = b.fantasy_team_id
        join public.profiles p on p.id = t.user_id
        where b.market_offer_id = offer.id
          and t.league_id = cfg.official_league_id
          and coalesce(p.access_enabled, true)
        order by b.amount desc, b.created_at asc, b.id asc
      loop
        select * into strict team_row
        from public.fantasy_teams
        where id = bid.fantasy_team_id
        for update;

        if exists (
          select 1
          from public.fantasy_roster_players r
          where r.league_id = cfg.official_league_id
            and r.player_id = offer.player_id
        ) then
          continue;
        end if;

        select b2.amount into second_bid
        from public.market_bids b2
        where b2.market_offer_id = offer.id
          and b2.id <> bid.id
        order by b2.amount desc, b2.created_at asc, b2.id asc
        limit 1;

        update public.fantasy_teams
        set budget = budget - bid.amount
        where id = team_row.id;

        insert into public.fantasy_roster_players(
          fantasy_team_id, league_id, player_id, purchase_price
        ) values (
          team_row.id, team_row.league_id, offer.player_id, bid.amount
        );

        insert into public.fantasy_transactions(
          fantasy_team_id, player_id, type, amount, balance_before, balance_after,
          description, metadata, idempotency_key
        ) values (
          team_row.id, offer.player_id, 'BUY', bid.amount, team_row.budget,
          team_row.budget - bid.amount, 'Adjudicación automática de puja',
          jsonb_build_object('marketOfferId', offer.id, 'weekStart', week_row),
          'normal-market:' || offer.id
        );

        insert into public.market_bid_results(
          market_offer_id, player_id, fantasy_team_id, winning_bid_id,
          winning_amount, second_amount
        ) values (
          offer.id, offer.player_id, team_row.id, bid.id, bid.amount, second_bid
        );

        awarded := awarded + 1;
        exit;
      end loop;
    end loop;
  end loop;

  -- Once the latest closed round is settled, prepare the next one exactly once.
  if target_week is null then
    select max(o.week_start) into latest_week
    from public.market_offers o
    where o.season_id = season
      and o.week_start <= current_week;

    if latest_week is not null then
      close_at := ((latest_week + 5)::timestamp + time '01:00:00') at time zone 'Europe/Madrid';
      next_week := latest_week + 7;
      if now() >= close_at and not exists (
        select 1
        from public.market_offers o
        where o.season_id = season
          and o.week_start = next_week
      ) then
        perform public.generate_weekly_market(season, next_week);
      end if;
    end if;
  end if;

  return awarded;
end
$$;

revoke all on function public.settle_normal_market(date) from public, anon, authenticated;
grant execute on function public.settle_normal_market(date) to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('mkworld-normal-market-settlement');
    exception when others then null;
    end;
    perform cron.schedule(
      'mkworld-normal-market-settlement',
      '* * * * *',
      'select public.settle_normal_market(null)'
    );
  end if;
exception when others then null;
end
$$;
