-- Sealed weekly bids: amounts stay private until settlement.
create table if not exists public.market_bids (
  id uuid primary key default gen_random_uuid(),
  market_offer_id uuid not null references public.market_offers(id) on delete cascade,
  fantasy_team_id uuid not null references public.fantasy_teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  week_start date not null,
  amount bigint not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market_offer_id, fantasy_team_id)
);

alter table public.market_bids enable row level security;
revoke all on public.market_bids from anon, authenticated;

create or replace function public.place_market_bid(target_team uuid, target_player uuid, bid_amount bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  team_row public.fantasy_teams;
  offer_row public.market_offers;
  player_row public.players;
begin
  select * into strict team_row from public.fantasy_teams where id = target_team and user_id = auth.uid();
  select * into strict offer_row from public.market_offers where player_id = target_player and week_start = date_trunc('week', now() at time zone 'Europe/Madrid')::date;
  select * into strict player_row from public.players where id = target_player;
  if bid_amount < player_row.initial_value then raise exception 'La puja mínima es el valor base del piloto'; end if;
  if bid_amount > team_row.budget then raise exception 'La puja supera tu presupuesto'; end if;
  if exists (select 1 from public.fantasy_roster_players where fantasy_team_id = team_row.id and player_id = target_player) then
    raise exception 'El piloto ya está en tu plantilla';
  end if;
  insert into public.market_bids(market_offer_id,fantasy_team_id,player_id,week_start,amount)
  values(offer_row.id, team_row.id, target_player, offer_row.week_start, bid_amount)
  on conflict (market_offer_id, fantasy_team_id) do update set amount=excluded.amount, updated_at=now();
end $$;
grant execute on function public.place_market_bid(uuid,uuid,bigint) to authenticated;

create or replace function public.market_bid_counts(target_week date)
returns table(player_id uuid, bidder_count bigint)
language sql stable security definer set search_path = '' as $$
  select b.player_id, count(distinct b.fantasy_team_id)
  from public.market_bids b
  where b.week_start = target_week
  group by b.player_id;
$$;
grant execute on function public.market_bid_counts(date) to authenticated;

create or replace function public.my_market_bids(target_week date)
returns table(player_id uuid)
language sql stable security definer set search_path = '' as $$
  select distinct b.player_id
  from public.market_bids b join public.fantasy_teams t on t.id=b.fantasy_team_id
  where b.week_start = target_week and t.user_id = auth.uid();
$$;
grant execute on function public.my_market_bids(date) to authenticated;
