-- Editorial automation must never make an otherwise valid sale fail.
create or replace function public.publish_team_transaction_news()
returns trigger language plpgsql security definer set search_path = '' as $$
declare team_name text; owner_name text; player_name text;
begin
  begin
    select ft.name, coalesce(p.display_name, ft.name) into team_name, owner_name
    from public.fantasy_teams ft left join public.profiles p on p.id = ft.user_id where ft.id = new.fantasy_team_id;
    select p.name into player_name from public.players p where p.id = new.player_id;
    if new.type = 'PILOT_MARKET_SALE'::public.transaction_type then
      insert into public.news_posts(title, body, category, published)
      values (left('Venta · ' || player_name, 140), owner_name || ' ha vendido a ' || player_name || ' por ' || to_char(new.amount, 'FM999G999G999G990') || ' €.', 'Mercado', true);
    elsif new.type = 'CLAUSE_PURCHASE'::public.transaction_type then
      insert into public.news_posts(title, body, category, published)
      values (left('Fichaje · ' || player_name, 140), owner_name || ' ha fichado a ' || player_name || ' pagando una cláusula de ' || to_char(new.amount, 'FM999G999G999G990') || ' €.', 'Fichajes', true);
    elsif new.type = 'CLAUSE_PROTECTION'::public.transaction_type then
      insert into public.news_posts(title, body, category, published)
      values (left('Jugador protegido · ' || player_name, 140), owner_name || ' ha protegido a ' || player_name || ' con una inversión de ' || to_char(new.amount, 'FM999G999G999G990') || ' €.', 'Fichajes', true);
    end if;
  exception when others then
    null;
  end;
  return new;
end $$;
