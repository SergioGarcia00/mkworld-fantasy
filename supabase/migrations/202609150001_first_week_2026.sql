-- Primera semana de Atlas League: 16–20 de septiembre de 2026.
-- La liga sigue siendo la actual. La operación de preparación es idempotente y
-- se niega a tocar una liga que ya tenga plantilla repartida.
alter table public.app_config
  add column if not exists first_week_mode boolean not null default false,
  add column if not exists first_week_initialized boolean not null default false,
  add column if not exists first_week_market_date date,
  add column if not exists first_week_market_open boolean not null default false;

create or replace function public.competition_market_week()
returns date language sql stable security definer set search_path='' as $$
  select case when first_week_mode then first_week_market_date
    when test_mode then test_market_week
    else date_trunc('week',now() at time zone 'Europe/Madrid')::date end
  from public.app_config where id=true;
$$;

create or replace function public.competition_market_open()
returns boolean language sql stable security definer set search_path='' as $$
  select case when first_week_mode then first_week_market_open
    when test_mode then test_market_open
    else extract(isodow from now() at time zone 'Europe/Madrid') <= 5
      and not (extract(isodow from now() at time zone 'Europe/Madrid')=1 and (now() at time zone 'Europe/Madrid')::time < time '01:00')
      and not (extract(isodow from now() at time zone 'Europe/Madrid')=5 and (now() at time zone 'Europe/Madrid')::time >= time '23:59') end
  from public.app_config where id=true;
$$;

create or replace function public.admin_prepare_first_week()
returns integer language plpgsql security definer set search_path='' as $$
declare cfg public.app_config; teams_count integer; inserted_count integer:=0; band_name text; player record; team_id uuid;
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  select * into strict cfg from public.app_config where id=true for update;
  if cfg.first_week_initialized then raise exception 'La primera semana ya está preparada'; end if;
  select count(*) into teams_count from public.fantasy_teams where league_id=cfg.official_league_id;
  if teams_count=0 then raise exception 'No hay participantes inscritos en la liga actual'; end if;
  if exists(select 1 from public.fantasy_roster_players where league_id=cfg.official_league_id) then
    raise exception 'No se puede repartir la plantilla inicial porque ya existen fichajes';
  end if;
  create temp table first_week_teams on commit drop as
    select id, 0::bigint as total_value, 0::integer as band_count from public.fantasy_teams
    where league_id=cfg.official_league_id;
  create temp table first_week_players on commit drop as
    select p.id,p.market_value,case when p.mmr between 8500 and 9500 then '9000' when p.mmr between 5500 and 6500 then '6000' when p.mmr between 3500 and 4500 then '4000' else '2000' end as band
    from public.players p where p.status='ACTIVE' and (
      p.mmr between 8500 and 9500 or p.mmr between 5500 and 6500 or p.mmr between 3500 and 4500 or p.mmr between 1500 and 2500
    );
  if (select count(*) from first_week_players where band='9000') < teams_count*2 or
     (select count(*) from first_week_players where band='6000') < teams_count*2 or
     (select count(*) from first_week_players where band='4000') < teams_count*2 or
     (select count(*) from first_week_players where band='2000') < teams_count*2 then
    raise exception 'No hay dos jugadores por banda de MMR para cada participante';
  end if;
  for band_name in select unnest(array['9000','6000','4000','2000']) loop
    for player in select f.* from first_week_players f where f.band=band_name order by f.market_value desc,f.id limit teams_count*2 loop
      select t.id into team_id from first_week_teams t where t.band_count < 2 order by t.total_value,t.id limit 1;
      insert into public.fantasy_roster_players(fantasy_team_id,league_id,player_id,purchase_price)
        values(team_id,cfg.official_league_id,player.id,player.market_value);
      update public.fantasy_teams set budget=budget-player.market_value where id=team_id;
      insert into public.fantasy_transactions(fantasy_team_id,player_id,type,amount,description,idempotency_key)
        values(team_id,player.id,'BUY',player.market_value,'Reparto inicial equilibrado · primera semana','first-week:'||player.id);
      update first_week_teams set total_value=total_value+player.market_value,band_count=band_count+1 where id=team_id;
      inserted_count:=inserted_count+1;
    end loop;
    update first_week_teams set band_count=0;
  end loop;
  update public.app_config set first_week_initialized=true,first_week_mode=true, test_mode=true,
    first_week_market_date='2026-09-16',first_week_market_open=false,test_market_week='2026-09-16',test_market_open=false,
    test_lineup_open=true,test_scores_open=true where id=true;
  return inserted_count;
end $$;
revoke all on function public.admin_prepare_first_week() from public,anon;
grant execute on function public.admin_prepare_first_week() to authenticated;

create or replace function public.admin_first_week_shop(target_day date)
returns integer language plpgsql security definer set search_path='' as $$
declare cfg public.app_config; season uuid; result integer;
begin
  if not public.is_admin() and auth.role()<>'service_role' then raise exception 'Solo administradores'; end if;
  if target_day < date '2026-09-16' or target_day > date '2026-09-20' then raise exception 'La primera semana solo va del 16 al 20 de septiembre'; end if;
  select * into strict cfg from public.app_config where id=true for update;
  if not cfg.first_week_mode then raise exception 'Inicializa primero la primera semana'; end if;
  select season_id into strict season from public.leagues where id=cfg.official_league_id;
  delete from public.market_offers where season_id=season and week_start=target_day;
  insert into public.market_offers(season_id,week_start,slot,player_id,mmr)
    select season,target_day,row_number() over(order by random()),p.id,p.mmr
    from public.players p
    where p.status='ACTIVE'
      and not exists(select 1 from public.fantasy_roster_players r where r.league_id=cfg.official_league_id and r.player_id=p.id)
    order by random() limit 10;
  select count(*) into result from public.market_offers where season_id=season and week_start=target_day;
  if result=0 then raise exception 'No hay pilotos disponibles para la tienda'; end if;
  update public.app_config set first_week_market_date=target_day,test_market_week=target_day,first_week_market_open=true,test_market_open=true where id=true;
  return result;
end $$;
revoke all on function public.admin_first_week_shop(date) from public,anon;
grant execute on function public.admin_first_week_shop(date) to authenticated;

create or replace function public.admin_first_week_settle(target_day date)
returns integer language plpgsql security definer set search_path='' as $$
declare cfg public.app_config; offer record; bid record; ft record; awarded integer:=0;
begin
  if not public.is_admin() and auth.role()<>'service_role' then raise exception 'Solo administradores'; end if;
  select * into strict cfg from public.app_config where id=true for update;
  for offer in select o.* from public.market_offers o where o.week_start=target_day and o.season_id=(select season_id from public.leagues where id=cfg.official_league_id) order by o.slot for update loop
    if exists(select 1 from public.market_bid_results where market_offer_id=offer.id) then continue; end if;
    for bid in select b.* from public.market_bids b join public.fantasy_teams t on t.id=b.fantasy_team_id where b.market_offer_id=offer.id and t.league_id=cfg.official_league_id order by b.amount desc,b.created_at,b.id loop
      select * into strict ft from public.fantasy_teams where id=bid.fantasy_team_id for update;
      if ft.budget < bid.amount or exists(select 1 from public.fantasy_roster_players where fantasy_team_id=ft.id and player_id=offer.player_id) or (select count(*) from public.fantasy_roster_players where fantasy_team_id=ft.id)>=cfg.squad_size then continue; end if;
      update public.fantasy_teams set budget=budget-bid.amount where id=ft.id;
      insert into public.fantasy_roster_players(fantasy_team_id,league_id,player_id,purchase_price) values(ft.id,ft.league_id,offer.player_id,bid.amount);
      insert into public.fantasy_transactions(fantasy_team_id,player_id,type,amount,description,idempotency_key) values(ft.id,offer.player_id,'BUY',bid.amount,'Adjudicación de subasta · primera semana','first-week-auction:'||offer.id);
      insert into public.market_bid_results(market_offer_id,player_id,fantasy_team_id,winning_bid_id,winning_amount) values(offer.id,offer.player_id,ft.id,bid.id,bid.amount);
      awarded:=awarded+1; exit;
    end loop;
  end loop;
  update public.app_config set first_week_market_open=false,test_market_open=false where id=true and first_week_market_date=target_day;
  return awarded;
end $$;
revoke all on function public.admin_first_week_settle(date) from public,anon;
grant execute on function public.admin_first_week_settle(date) to authenticated;

create or replace function public.admin_first_week_tick()
returns integer language plpgsql security definer set search_path='' as $$
declare cfg public.app_config; local_now timestamp; today date; current_day date; generated integer:=0;
begin
  if not public.is_admin() and auth.role()<>'service_role' then raise exception 'Solo administradores'; end if;
  select * into strict cfg from public.app_config where id=true for update;
  if not cfg.first_week_mode then return 0; end if;
  local_now:=now() at time zone 'Europe/Madrid'; today:=local_now::date;
  if today < date '2026-09-16' or today > date '2026-09-20' then return 0; end if;
  current_day:=coalesce(cfg.first_week_market_date,date '2026-09-16');
  if current_day < today and cfg.first_week_market_open then perform public.admin_first_week_settle(current_day); end if;
  if local_now::time >= time '10:00' and (select first_week_market_date from public.app_config where id=true) is distinct from today then generated:=public.admin_first_week_shop(today); end if;
  if local_now::time >= time '23:00' and (select first_week_market_open from public.app_config where id=true) then perform public.admin_first_week_settle(today); end if;
  return generated;
end $$;
revoke all on function public.admin_first_week_tick() from public,anon;
grant execute on function public.admin_first_week_tick() to authenticated,service_role;

-- Programa la comprobación cada minuto cuando pg_cron está disponible en Supabase.
do $$ begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    perform cron.schedule('mkworld-first-week-2026','* * * * *','select public.admin_first_week_tick()');
  end if;
exception when others then null;
end $$;
