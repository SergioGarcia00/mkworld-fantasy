alter table public.market_bid_results add column if not exists winning_amount bigint;
alter table public.market_bid_results add column if not exists second_amount bigint;

create or replace function public.publish_market_winner_news(target_week date)
returns integer language plpgsql security definer set search_path = '' as $$
declare added integer := 0;
begin
  if now() < ((target_week + 4)::timestamp at time zone 'Europe/Madrid') + interval '23 hours 59 minutes 59 seconds' then return 0; end if;
  with ranked as (
    select b.*, row_number() over (partition by b.market_offer_id order by b.amount desc,b.created_at asc,b.id asc) as rank
    from public.market_bids b where b.week_start=target_week
  ), winners as (
    insert into public.market_bid_results(market_offer_id,player_id,fantasy_team_id,winning_bid_id,winning_amount,second_amount)
    select r.market_offer_id,r.player_id,r.fantasy_team_id,r.id,r.amount,
      (select r2.amount from ranked r2 where r2.market_offer_id=r.market_offer_id and r2.rank=2)
    from ranked r where r.rank=1
    on conflict (market_offer_id) do update set winning_amount=excluded.winning_amount,second_amount=excluded.second_amount where public.market_bid_results.winning_amount is null
    returning player_id,fantasy_team_id,winning_amount,second_amount
  )
  insert into public.news_posts(title,body,category,published)
  select left('Mercado cerrado · '||p.name,140),
    'Ganador: '||pr.display_name||' · Precio ganador: '||to_char(w.winning_amount,'FM999G999G999G990')||' € · Segunda puja: '||coalesce(to_char(w.second_amount,'FM999G999G999G990')||' €','Sin segunda puja')||'.',
    'Mercado',true
  from winners w join public.players p on p.id=w.player_id join public.fantasy_teams ft on ft.id=w.fantasy_team_id join public.profiles pr on pr.id=ft.user_id;
  get diagnostics added=row_count; return added;
end $$;
