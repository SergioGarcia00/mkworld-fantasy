-- Visitors can inspect the current market, while bidding remains authenticated-only.
grant select on public.market_offers to anon;
drop policy if exists market_read_anon on public.market_offers;
create policy market_read_anon on public.market_offers
  for select to anon using (true);
