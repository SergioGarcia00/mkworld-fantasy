-- Complete the transaction ledger columns required by economy operations.
alter table public.fantasy_transactions
  add column if not exists round_id uuid references public.matchdays(id),
  add column if not exists balance_before bigint,
  add column if not exists balance_after bigint,
  add column if not exists description text,
  add column if not exists metadata jsonb;
alter type public.transaction_type add value if not exists 'PILOT_MARKET_SALE';
alter type public.transaction_type add value if not exists 'CLAUSE_PURCHASE';
alter type public.transaction_type add value if not exists 'CLAUSE_SALE';
alter type public.transaction_type add value if not exists 'CLAUSE_PROTECTION';
