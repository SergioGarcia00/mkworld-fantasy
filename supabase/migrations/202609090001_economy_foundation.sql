-- Economy foundation: integer euros, configurable defaults and an auditable ledger.
alter table public.app_config
  add column if not exists money_per_point bigint not null default 10000 check (money_per_point >= 0),
  add column if not exists max_money_from_points_per_round bigint not null default 12000000 check (max_money_from_points_per_round >= 0),
  add column if not exists participation_bonus bigint not null default 1000000 check (participation_bonus >= 0),
  add column if not exists first_place_bonus bigint not null default 2000000 check (first_place_bonus >= 0),
  add column if not exists second_place_bonus bigint not null default 1000000 check (second_place_bonus >= 0),
  add column if not exists third_place_bonus bigint not null default 500000 check (third_place_bonus >= 0),
  add column if not exists market_sell_percentage numeric(5,2) not null default 95 check (market_sell_percentage between 0 and 100),
  add column if not exists player_transfer_fee_percent numeric(5,2) not null default 3 check (player_transfer_fee_percent between 0 and 100),
  add column if not exists max_weekly_value_change_percent numeric(5,2) not null default 10 check (max_weekly_value_change_percent between 0 and 100);

alter table public.fantasy_transactions
  add column if not exists round_id uuid references public.matchdays(id),
  add column if not exists balance_before bigint,
  add column if not exists balance_after bigint,
  add column if not exists description text,
  add column if not exists metadata jsonb;

alter type public.transaction_type add value if not exists 'ROUND_POINTS_REWARD';
alter type public.transaction_type add value if not exists 'ROUND_POSITION_BONUS';
alter type public.transaction_type add value if not exists 'ROUND_PARTICIPATION_BONUS';
alter type public.transaction_type add value if not exists 'PILOT_MARKET_SALE';
alter type public.transaction_type add value if not exists 'PLAYER_TRANSFER_PURCHASE';
alter type public.transaction_type add value if not exists 'PLAYER_TRANSFER_SALE';
alter type public.transaction_type add value if not exists 'TRANSFER_FEE';
alter type public.transaction_type add value if not exists 'ADMIN_ADJUSTMENT';

create unique index if not exists fantasy_transactions_round_reward_idx
  on public.fantasy_transactions(fantasy_team_id, round_id, type)
  where round_id is not null and type in ('ROUND_POINTS_REWARD','ROUND_POSITION_BONUS','ROUND_PARTICIPATION_BONUS');
