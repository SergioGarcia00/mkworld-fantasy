-- Las reglas exigen una plaza de Code Genius en cada mercado.
create or replace function public.admin_first_week_shop(target_day date)
returns integer language plpgsql security definer set search_path='' as $$
declare cfg public.app_config; season uuid; result integer;
begin
  if not public.is_admin() and auth.role()<>'service_role' then raise exception 'Solo administradores'; end if;
  if target_day < date '2026-09-16' or target_day > date '2026-09-20' then raise exception 'La primera semana solo va del 16 al 20 de septiembre'; end if;
  select * into strict cfg from public.app_config where id=true for update;
  if not cfg.first_week_mode then raise exception 'Inicializa primero la primera semana'; end if;
  select season_id into strict season from public.leagues where id=cfg.official_league_id;
  if not exists (
    select 1 from public.players p join public.teams t on t.id=p.team_id
    where lower(t.name)='code genius' and p.status='ACTIVE'
      and not exists(select 1 from public.fantasy_roster_players r where r.league_id=cfg.official_league_id and r.player_id=p.id)
  ) then raise exception 'No hay jugadores de Code Genius disponibles'; end if;
  delete from public.market_offers where season_id=season and week_start=target_day;
  with code as (
    select p.id,coalesce(p.mmr,0) mmr from public.players p join public.teams t on t.id=p.team_id
    where lower(t.name)='code genius' and p.status='ACTIVE'
      and not exists(select 1 from public.fantasy_roster_players r where r.league_id=cfg.official_league_id and r.player_id=p.id)
    order by random() limit 1
  ), rest as (
    select p.id,coalesce(p.mmr,0) mmr from public.players p
    where p.status='ACTIVE'
      and not exists(select 1 from public.fantasy_roster_players r where r.league_id=cfg.official_league_id and r.player_id=p.id)
      and not exists(select 1 from public.teams t where t.id=p.team_id and lower(t.name)='code genius')
    order by random() limit 9
  )
  insert into public.market_offers(season_id,week_start,slot,player_id,mmr)
  select season,target_day,1,id,mmr from code
  union all
  select season,target_day,row_number() over(order by random())+1,id,mmr from rest;
  select count(*) into result from public.market_offers where season_id=season and week_start=target_day;
  if result<10 then raise exception 'No hay suficientes pilotos para la tienda'; end if;
  update public.app_config set first_week_market_date=target_day,test_market_week=target_day,first_week_market_open=true,test_market_open=true where id=true;
  return result;
end $$;

