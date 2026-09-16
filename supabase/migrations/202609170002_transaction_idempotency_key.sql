alter table public.fantasy_transactions add column if not exists idempotency_key text;
create unique index if not exists fantasy_transactions_team_idempotency_key
  on public.fantasy_transactions(fantasy_team_id, idempotency_key)
  where idempotency_key is not null;
