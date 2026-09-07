-- Weekly market: 10 random offers by MMR bands.
alter table public.players add column if not exists mmr integer check (mmr is null or mmr >= 0);
create table if not exists public.market_offers (
 id uuid primary key default gen_random_uuid(),
 season_id uuid not null references public.seasons(id),
 week_start date not null,
 slot integer not null check (slot between 1 and 10),
 player_id uuid not null references public.players(id),
 mmr integer not null check (mmr >= 0),
 created_at timestamptz not null default now(),
 unique(season_id, week_start, slot),
 unique(season_id, week_start, player_id)
);
alter table public.market_offers enable row level security;
grant select on public.market_offers to authenticated;
create policy market_read on public.market_offers for select to authenticated using (true);

create or replace function public.generate_weekly_market(target_season uuid, target_week date default null)
returns integer language plpgsql security definer set search_path='' as $$
declare week_date date := coalesce(target_week, date_trunc('week', now() at time zone 'Europe/Madrid')::date);
begin
 delete from public.market_offers where season_id=target_season and week_start=week_date;
 with high as (select id,mmr,row_number() over(order by random()) slot from public.players where mmr>9000 and status='ACTIVE' order by random() limit 2),
 mid as (select id,mmr,row_number() over(order by random())+2 slot from public.players where mmr between 4000 and 5000 and status='ACTIVE' order by random() limit 6),
 low as (select id,mmr,9 slot from public.players where mmr<4000 and status='ACTIVE' and team_id not in (select id from public.teams where lower(name)='code genius') order by random() limit 1),
 code as (select p.id,p.mmr,10 slot from public.players p join public.teams t on t.id=p.team_id where lower(t.name)='code genius' and p.status='ACTIVE' order by random() limit 1), picks as (select * from high union all select * from mid union all select * from low union all select * from code)
 insert into public.market_offers(season_id,week_start,slot,player_id,mmr) select target_season,week_date,slot,id,mmr from picks;
 return (select count(*) from public.market_offers where season_id=target_season and week_start=week_date);
end $$;
revoke all on function public.generate_weekly_market(uuid,date) from public,anon,authenticated;
grant execute on function public.generate_weekly_market(uuid,date) to service_role;

-- Requires pg_cron enabled in Supabase. Run once after applying this migration:
-- select cron.schedule('mkworld-weekly-market','0 1 * * 1', $$select public.generate_weekly_market((select id from public.seasons order by created_at desc limit 1), null);$$);
