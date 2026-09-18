-- Build market winner news exclusively from settled results.
-- The previous implementation recomputed bids and could publish stale or mismatched names.
create or replace function public.publish_market_winner_news(target_week date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  added integer := 0;
  inserted_count integer;
  settled record;
begin
  for settled in
    select r.winning_amount, p.name as player_name, o.week_start,
      ft.name as team_name, coalesce(pr.display_name, ft.name) as owner_name
    from public.market_bid_results r
    join public.market_offers o on o.id = r.market_offer_id
    join public.players p on p.id = r.player_id
    join public.fantasy_teams ft on ft.id = r.fantasy_team_id
    left join public.profiles pr on pr.id = ft.user_id
    where o.week_start = target_week and r.winning_amount is not null
  loop
    insert into public.news_posts(title, body, category, published)
    select
      left('Subasta ganada · ' || settled.player_name || ' · ' || settled.week_start::text, 140),
      settled.owner_name || ' (' || settled.team_name || ') gana la subasta de ' ||
        settled.player_name || ' por ' || to_char(settled.winning_amount, 'FM999G999G999G990') || ' €.',
      'Mercado', true
    where not exists (
      select 1 from public.news_posts n
      where n.title = left('Subasta ganada · ' || settled.player_name || ' · ' || settled.week_start::text, 140)
    );
    get diagnostics inserted_count = row_count;
    added := added + inserted_count;
  end loop;
  return added;
end
$$;

grant execute on function public.publish_market_winner_news(date) to anon, authenticated;
