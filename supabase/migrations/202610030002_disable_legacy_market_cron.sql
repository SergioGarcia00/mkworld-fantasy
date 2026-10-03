-- The Saturday settlement now prepares the next round. The old Monday
-- generator would delete weekend bids, so remove that legacy cron job.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('mkworld-weekly-market');
    exception when others then null;
    end;
  end if;
exception when others then null;
end
$$;
