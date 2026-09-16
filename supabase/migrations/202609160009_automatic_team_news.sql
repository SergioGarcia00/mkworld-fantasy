-- Publish public news whenever a team operation is committed.
create or replace function public.publish_team_transaction_news()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  team_name text;
  owner_name text;
  player_name text;
begin
  select ft.name, coalesce(p.display_name, ft.name) into team_name, owner_name
  from public.fantasy_teams ft left join public.profiles p on p.id = ft.user_id
  where ft.id = new.fantasy_team_id;
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
  return new;
end $$;
drop trigger if exists team_transaction_news on public.fantasy_transactions;
create trigger team_transaction_news after insert on public.fantasy_transactions
for each row execute function public.publish_team_transaction_news();

create or replace function public.publish_lineup_news()
returns trigger language plpgsql security definer set search_path = '' as $$
declare team_name text; owner_name text; matchday_name text; starters text; captain text;
begin
  if new.locked_at is null or (old.locked_at is not null) then return new; end if;
  select ft.name, coalesce(p.display_name, ft.name) into team_name, owner_name from public.fantasy_teams ft left join public.profiles p on p.id=ft.user_id where ft.id=new.fantasy_team_id;
  select md.name into matchday_name from public.matchdays md where md.id=new.matchday_id;
  select string_agg(player_name, ', ' order by player_name) into starters from public.fantasy_lineup_players where lineup_id=new.id and is_starter;
  select player_name into captain from public.fantasy_lineup_players where lineup_id=new.id and is_captain;
  insert into public.news_posts(title,body,category,published) values (left('Alineación bloqueada · '||team_name,140), owner_name||' ha bloqueado su alineación para '||coalesce(matchday_name,'la próxima jornada')||'. Titulares: '||coalesce(starters,'Pendientes')||'. Capitán: '||coalesce(captain,'Pendiente')||'.','Competición',true);
  return new;
end $$;
drop trigger if exists lineup_news on public.fantasy_lineups;
create trigger lineup_news after update of locked_at on public.fantasy_lineups
for each row execute function public.publish_lineup_news();
