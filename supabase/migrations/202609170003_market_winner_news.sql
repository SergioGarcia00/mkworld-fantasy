-- Publish a readable news item as soon as each sealed auction is settled.
create or replace function public.publish_market_result_news()
returns trigger language plpgsql security definer set search_path = '' as $$
declare player_name text; team_name text; owner_name text; week date; headline text; paid bigint;
begin
  select p.name, o.week_start into player_name, week
  from public.players p join public.market_offers o on o.id = new.market_offer_id;
  select ft.name, coalesce(pr.display_name, ft.name)
    into team_name, owner_name
  from public.fantasy_teams ft left join public.profiles pr on pr.id = ft.user_id
  where ft.id = new.fantasy_team_id;
  select coalesce(new.winning_amount, b.amount) into paid
  from public.market_bids b where b.id = new.winning_bid_id;
  headline := left('Subasta ganada · ' || player_name || ' · ' || week::text, 140);
  if not exists (select 1 from public.news_posts n where n.title = headline) then
    insert into public.news_posts(title, body, category, published)
    values (
      headline,
      coalesce(owner_name, team_name) || ' (' || team_name || ') gana la subasta de ' ||
      player_name || ' por ' || to_char(paid, 'FM999G999G999G990') || ' €.',
      'Mercado', true
    );
  end if;
  return new;
exception when others then
  -- Editorial output must never roll back a valid auction settlement.
  return new;
end $$;

drop trigger if exists market_result_news on public.market_bid_results;
create trigger market_result_news after insert on public.market_bid_results
for each row execute function public.publish_market_result_news();

-- Backfill results already settled before the trigger was installed.
insert into public.news_posts(title, body, category, published)
select left('Subasta ganada · ' || p.name || ' · ' || o.week_start::text, 140),
  coalesce(pr.display_name, ft.name) || ' (' || ft.name || ') gana la subasta de ' ||
  p.name || ' por ' || to_char(r.winning_amount, 'FM999G999G999G990') || ' €.',
  'Mercado', true
from public.market_bid_results r
join public.market_offers o on o.id = r.market_offer_id
join public.players p on p.id = r.player_id
join public.fantasy_teams ft on ft.id = r.fantasy_team_id
left join public.profiles pr on pr.id = ft.user_id
where r.winning_amount is not null
  and not exists (
    select 1 from public.news_posts n
    where n.title = left('Subasta ganada · ' || p.name || ' · ' || o.week_start::text, 140)
  );
