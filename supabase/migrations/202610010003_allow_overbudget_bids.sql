-- Permite registrar pujas selladas por encima del saldo disponible.
-- Si una puja sobregirada gana, el saldo queda negativo; la validacion de
-- alineaciones sigue impidiendo guardar mientras el presupuesto sea negativo.
create or replace function public.place_market_bid(target_team uuid, target_player uuid, bid_amount bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  team_row public.fantasy_teams;
  offer_row public.market_offers;
  player_row public.players;
begin
  perform 1 from public.app_config where id = true for share;

  if not public.competition_market_open() then
    raise exception 'El mercado está cerrado';
  end if;

  if bid_amount <= 0 then
    raise exception 'Indica una puja válida';
  end if;

  select * into strict team_row
  from public.fantasy_teams
  where id = target_team and user_id = auth.uid();

  select * into strict offer_row
  from public.market_offers
  where player_id = target_player
    and week_start = public.competition_market_week();

  if exists (
    select 1 from public.market_bid_results
    where market_offer_id = offer_row.id
  ) then
    raise exception 'Oferta ya adjudicada';
  end if;

  select * into strict player_row
  from public.players
  where id = target_player;

  if bid_amount < player_row.initial_value then
    raise exception 'La puja mínima es el valor base del piloto';
  end if;

  if exists (
    select 1 from public.fantasy_roster_players
    where fantasy_team_id = team_row.id and player_id = target_player
  ) then
    raise exception 'El piloto ya está en tu plantilla';
  end if;

  insert into public.market_bids(
    market_offer_id, fantasy_team_id, player_id, week_start, amount
  ) values (
    offer_row.id, team_row.id, target_player, offer_row.week_start, bid_amount
  )
  on conflict (market_offer_id, fantasy_team_id)
  do update set amount = excluded.amount, updated_at = now();
end
$$;

revoke all on function public.place_market_bid(uuid, uuid, bigint) from public, anon;
grant execute on function public.place_market_bid(uuid, uuid, bigint) to authenticated;

-- Las pujas por encima del saldo también pueden adjudicarse. El saldo se
-- actualiza de forma normal y puede quedar negativo hasta que el participante
-- venda o reciba fondos; la alineacion lo bloquea mientras siga negativo.
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
        select 1 from public.market_bid_results r
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
          select 1 from public.fantasy_roster_players r
          where r.league_id = cfg.official_league_id
            and r.player_id = offer.player_id
        ) then
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

  return awarded;
end
$$;

revoke all on function public.settle_normal_market(date) from public, anon, authenticated;
grant execute on function public.settle_normal_market(date) to service_role;
