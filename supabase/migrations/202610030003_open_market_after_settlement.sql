-- The next round opens immediately after Saturday's adjudication. The normal
-- market has no dead period; test and first-week controls keep their own state.
create or replace function public.competition_market_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when first_week_mode then first_week_market_open
    when test_mode then test_market_open
    else true
  end
  from public.app_config
  where id = true;
$$;

revoke all on function public.competition_market_open() from public;
grant execute on function public.competition_market_open() to anon, authenticated, service_role;
