-- Cierre automático del mercado normal.
-- La tienda se cierra el viernes a las 23:59 (hora de Madrid). Cada oferta
-- cerrada se adjudica al mejor postor válido y el fichaje se cobra de forma
-- idempotente mediante market_bid_results.
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
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Solo administradores';
  end if;

  select * into strict cfg from public.app_config where id = true for update;
  if cfg.first_week_mode or cfg.test_mode then
    return 0;
  end if;

  current_week := date_trunc('week', now() at time zone 'Europe/Madrid')::date;

  for week_row in
    select distinct o.week_start
    from public.market_offers o
    where o.season_id = (select season_id from public.leagues where id = cfg.official_league_id)
      and (target_week is null or o.week_start = target_week)
      and o.week_start <= current_week
  loop
    close_at := ((week_row + 4)::timestamp + time '23:59:00') at time zone 'Europe/Madrid';
    if now() < close_at then
      continue;
    end if;

    for offer in
      select o.*
      from public.market_offers o
      where o.season_id = (select season_id from public.leagues where id = cfg.official_league_id)
        and o.week_start = week_row
      order by o.slot
      for update
    loop
      if exists (
        select 1 from public.market_bid_results r where r.market_offer_id = offer.id
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
          select 1 from public.fantasy_roster_players r
          where r.league_id = cfg.official_league_id and r.player_id = offer.player_id
        ) or team_row.budget < bid.amount then
          continue;
        end if;

        select b2.amount into second_bid
        from public.market_bids b2
        where b2.market_offer_id = offer.id and b2.id <> bid.id
        order by b2.amount desc, b2.created_at asc, b2.id asc
        limit 1;

        update public.fantasy_teams
        set budget = budget - bid.amount
        where id = team_row.id;

        insert into public.fantasy_roster_players(
          fantasy_team_id, league_id, player_id, purchase_price
        ) values (team_row.id, team_row.league_id, offer.player_id, bid.amount);

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

  return awarded;
end
$$;

revoke all on function public.settle_normal_market(date) from public, anon, authenticated;
grant execute on function public.settle_normal_market(date) to service_role;

-- Un cron por minuto hace que la adjudicación ocurra al cerrar el mercado,
-- aunque ningún usuario vuelva a abrir la web.
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
