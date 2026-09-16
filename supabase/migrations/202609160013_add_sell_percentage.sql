-- Ensure the economy setting used by the sale RPC exists in every environment.
alter table public.app_config
  add column if not exists market_sell_percentage numeric(5,2) not null default 95
  check (market_sell_percentage between 0 and 100);
update public.app_config set market_sell_percentage = 95 where id = true and market_sell_percentage is null;
