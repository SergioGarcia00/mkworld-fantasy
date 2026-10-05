-- Selling a pilot refunds every euro spent to raise that pilot's clause.
-- The normal market sale percentage still applies to the pilot's market value.
alter table public.fantasy_roster_players
  add column if not exists clause_protection_spent bigint not null default 0
    check (clause_protection_spent >= 0);

-- Preserve the exact spend for rosters that already existed before the column
-- was introduced. Current clause protection uses a 2:1 increase, so the
-- transaction ledger is preferred and the clause amount is a safe fallback.
update public.fantasy_roster_players r
set clause_protection_spent = coalesce(
  (
    select sum(t.amount)::bigint
    from public.fantasy_transactions t
    where t.fantasy_team_id = r.fantasy_team_id
      and t.player_id = r.player_id
      and t.type = 'CLAUSE_PROTECTION'::public.transaction_type
      and t.created_at >= r.acquired_at
  ),
  ceil(r.clause_protection_amount / 2.0)::bigint,
  0
);

create or replace function public.protect_player_clause(
  target_team uuid,
  target_player uuid,
  spend_amount bigint,
  idempotency text
)
returns table(
  market_value bigint,
  previous_clause bigint,
  new_clause bigint,
  spent bigint,
  balance_after bigint
)
language plpgsql security definer set search_path='' as $$
declare
  team_row public.fantasy_teams;
  roster_row public.fantasy_roster_players;
  player_value bigint;
  cfg public.app_config;
  base_clause bigint;
  max_clause bigint;
  remaining bigint;
  increase bigint;
  before_balance bigint;
  effective_spend bigint;
begin
  select * into strict team_row
  from public.fantasy_teams
  where id = target_team and user_id = auth.uid()
  for update;

  select * into strict roster_row
  from public.fantasy_roster_players
  where fantasy_team_id = target_team and player_id = target_player
  for update;

  select p.market_value into strict player_value
  from public.players p
  where p.id = target_player;

  select * into strict cfg
  from public.app_config
  where id = true;

  if spend_amount is null or spend_amount <= 0 then
    raise exception 'El gasto debe ser mayor que cero';
  end if;

  if idempotency is not null and exists(
    select 1
    from public.fantasy_transactions
    where fantasy_team_id = target_team and idempotency_key = idempotency
  ) then
    return query
      select player_value,
             round(player_value * cfg.clause_base_multiplier),
             round(player_value * cfg.clause_base_multiplier) + roster_row.clause_protection_amount,
             0::bigint,
             team_row.budget;
    return;
  end if;

  base_clause := round(player_value * cfg.clause_base_multiplier);
  max_clause := round(player_value * cfg.max_clause_multiplier);
  remaining := greatest(0, max_clause - base_clause - roster_row.clause_protection_amount);
  if remaining <= 0 then
    raise exception 'La cláusula ya está en su máximo';
  end if;

  effective_spend := least(spend_amount, ceil(remaining / 2.0)::bigint);
  if effective_spend > team_row.budget then
    raise exception 'Saldo insuficiente';
  end if;
  increase := least(remaining, effective_spend * 2);
  before_balance := team_row.budget;

  update public.fantasy_teams
  set budget = budget - effective_spend
  where id = team_row.id;

  update public.fantasy_roster_players
  set clause_protection_amount = clause_protection_amount + increase,
      clause_protection_spent = clause_protection_spent + effective_spend
  where fantasy_team_id = target_team and player_id = target_player;

  insert into public.fantasy_transactions(
    fantasy_team_id, player_id, type, amount, balance_before, balance_after,
    description, metadata, idempotency_key
  ) values(
    target_team, target_player, 'CLAUSE_PROTECTION', effective_spend,
    before_balance, before_balance - effective_spend,
    'Protección de cláusula',
    jsonb_build_object(
      'previousClause', base_clause + roster_row.clause_protection_amount,
      'protectionCost', effective_spend,
      'clauseIncrease', increase,
      'newClause', base_clause + roster_row.clause_protection_amount + increase,
      'efficiency', 2
    ),
    idempotency
  );

  return query
    select player_value,
           base_clause + roster_row.clause_protection_amount,
           base_clause + roster_row.clause_protection_amount + increase,
           effective_spend,
           before_balance - effective_spend;
end $$;

revoke all on function public.protect_player_clause(uuid,uuid,bigint,text) from public,anon;
grant execute on function public.protect_player_clause(uuid,uuid,bigint,text) to authenticated;

create or replace function public.sell_player(target_fantasy_team uuid, target_player uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  team_row public.fantasy_teams;
  roster_row public.fantasy_roster_players;
  player_value bigint;
  market_sale_price bigint;
  clause_refund bigint;
  total_sale_price bigint;
  before_balance bigint;
  config_row public.app_config;
begin
  if not public.competition_market_open() then
    raise exception 'El mercado está cerrado';
  end if;

  select * into strict team_row
  from public.fantasy_teams
  where id = target_fantasy_team and user_id = auth.uid()
  for update;

  select * into strict roster_row
  from public.fantasy_roster_players
  where fantasy_team_id = team_row.id and player_id = target_player
  for update;

  select market_value into strict player_value
  from public.players
  where id = target_player;

  select * into strict config_row
  from public.app_config
  where id = true;

  market_sale_price := floor(player_value * config_row.market_sell_percentage / 100);
  clause_refund := coalesce(roster_row.clause_protection_spent, 0);
  total_sale_price := market_sale_price + clause_refund;
  before_balance := team_row.budget;

  delete from public.fantasy_roster_players
  where fantasy_team_id = team_row.id and player_id = target_player;

  update public.fantasy_teams
  set budget = budget + total_sale_price
  where id = team_row.id;

  insert into public.fantasy_transactions(
    fantasy_team_id, player_id, type, amount, balance_before, balance_after,
    description, metadata
  ) values(
    team_row.id, target_player, 'PILOT_MARKET_SALE', total_sale_price,
    before_balance, before_balance + total_sale_price,
    'Venta inmediata al mercado',
    jsonb_build_object(
      'marketValue', player_value,
      'sellPercentage', config_row.market_sell_percentage,
      'marketSalePrice', market_sale_price,
      'clauseProtectionRefund', clause_refund,
      'salePrice', total_sale_price
    )
  );
end $$;

revoke all on function public.sell_player(uuid,uuid) from public,anon;
grant execute on function public.sell_player(uuid,uuid) to authenticated;
