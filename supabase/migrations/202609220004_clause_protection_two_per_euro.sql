-- Clause protection accepts any whole-euro amount and always adds exactly
-- two euros to the clause for every euro spent, up to the configured cap.
update public.app_config
set clause_protection_efficiency = 2
where id = true;

alter table public.app_config
  alter column clause_protection_efficiency set default 2;

create or replace function public.protect_player_clause(target_team uuid,target_player uuid,spend_amount bigint,idempotency text)
returns table(market_value bigint,previous_clause bigint,new_clause bigint,spent bigint,balance_after bigint)
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

  select market_value into strict player_value
  from public.players
  where id = target_player;

  select * into strict cfg
  from public.app_config
  where id = true;

  if spend_amount is null or spend_amount <= 0 then
    raise exception 'El gasto debe ser mayor que cero';
  end if;

  if idempotency is not null and exists(
    select 1 from public.fantasy_transactions
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

  -- One euro spent raises the clause by exactly two euros.
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
  set clause_protection_amount = clause_protection_amount + increase
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
