create table if not exists public.market_bid_results (
  market_offer_id uuid primary key references public.market_offers(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  fantasy_team_id uuid not null references public.fantasy_teams(id) on delete cascade,
  winning_bid_id uuid not null references public.market_bids(id) on delete cascade,
  settled_at timestamptz not null default now()
);
alter table public.market_bid_results enable row level security;
revoke all on public.market_bid_results from anon, authenticated;

create or replace function public.publish_market_winner_news(target_week date)
returns integer language plpgsql security definer set search_path = '' as $$
declare added integer := 0;
begin
  if now() < ((target_week + 4)::timestamp at time zone 'Europe/Madrid') + interval '23 hours 59 minutes 59 seconds' then
    return 0;
  end if;
  with ranked as (
    select b.*, row_number() over (partition by b.market_offer_id order by b.amount desc, b.created_at asc, b.id asc) as rank
    from public.market_bids b where b.week_start = target_week
  ), winners as (
    insert into public.market_bid_results(market_offer_id,player_id,fantasy_team_id,winning_bid_id)
    select market_offer_id,player_id,fantasy_team_id,id from ranked where rank=1
    on conflict (market_offer_id) do nothing
    returning player_id,fantasy_team_id
  )
  insert into public.news_posts(title,body,category,published)
  select left('Mercado cerrado · ' || p.name,140), 'La puja sellada la gana ' || pr.display_name || '. Gracias a todos los participantes.', 'Mercado', true
  from winners w join public.players p on p.id=w.player_id join public.fantasy_teams ft on ft.id=w.fantasy_team_id join public.profiles pr on pr.id=ft.user_id;
  get diagnostics added = row_count;
  return added;
end $$;
grant execute on function public.publish_market_winner_news(date) to anon, authenticated;
