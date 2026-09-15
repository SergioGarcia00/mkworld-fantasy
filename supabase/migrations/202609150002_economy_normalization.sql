-- Economy normalization: a readable budget and a transparent MMR-based price scale.
alter table public.app_config add column if not exists economy_normalized boolean not null default false;

create or replace function public.admin_normalize_economy()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare cfg public.app_config; team_row record; old_budget bigint; new_budget bigint;
        changed_players integer; changed_teams integer := 0;
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  select * into strict cfg from public.app_config where id = true for update;
  if cfg.economy_normalized then raise exception 'La economía ya está normalizada'; end if;

  update public.players
  set market_value = least(150000, greatest(15000, round((20000 + coalesce(mmr, 5000) * 10)::numeric / 1000) * 1000)::bigint),
      initial_value = least(150000, greatest(15000, round((20000 + coalesce(mmr, 5000) * 10)::numeric / 1000) * 1000)::bigint);
  get diagnostics changed_players = row_count;

  update public.fantasy_roster_players rp
  set purchase_price = p.market_value, clause_protection_amount = 0, clause_protected_until = null
  from public.players p where p.id = rp.player_id;

  for team_row in select id, budget from public.fantasy_teams for update loop
    old_budget := team_row.budget;
    select greatest(0, 1000000 - coalesce(sum(rp.purchase_price), 0)) into new_budget
      from public.fantasy_roster_players rp where rp.fantasy_team_id = team_row.id;
    update public.fantasy_teams set budget = new_budget where id = team_row.id;
    if old_budget <> new_budget then
      insert into public.fantasy_transactions
        (fantasy_team_id, player_id, type, amount, balance_before, balance_after, description, metadata, idempotency_key)
      values (team_row.id, null, 'ADMIN_ADJUSTMENT', abs(new_budget - old_budget), old_budget, new_budget,
        'Normalización de economía', jsonb_build_object('oldBudget', old_budget, 'newBudget', new_budget),
        'economy-normalization:' || team_row.id) on conflict (idempotency_key) do nothing;
      changed_teams := changed_teams + 1;
    end if;
  end loop;

  update public.leagues set starting_budget = 1000000;
  update public.app_config set starting_budget = 1000000, initial_player_value = 60000,
    money_per_point = 100, max_money_from_points_per_round = 12000, participation_bonus = 2000,
    first_place_bonus = 5000, second_place_bonus = 3000, third_place_bonus = 2000,
    market_sell_percentage = 90, player_transfer_fee_percent = 3, economy_normalized = true where id = true;
  return jsonb_build_object('players', changed_players, 'teamsAdjusted', changed_teams,
    'startingBudget', 1000000, 'priceRange', jsonb_build_array(15000, 150000));
end; $$;
revoke all on function public.admin_normalize_economy() from public, anon, authenticated;
grant execute on function public.admin_normalize_economy() to service_role;
