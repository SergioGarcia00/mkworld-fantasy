-- Enforce Europe/Madrid deadlines even for direct RPC calls.
create or replace function public.save_lineup(target_team uuid, target_matchday uuid, starters uuid[], captain uuid)
returns void language plpgsql security definer set search_path='' as $$
declare saved_lineup_id uuid; owned_count integer;
begin
 if not exists(select 1 from public.fantasy_teams where id=target_team and user_id=auth.uid()) then raise exception 'Equipo no autorizado'; end if;
 if exists(select 1 from public.matchdays where id=target_matchday and status in ('LOCKED','FINISHED')) then raise exception 'La jornada está cerrada'; end if;
 if not exists(select 1 from public.matchdays where id=target_matchday and now() < least(lock_at, (date_trunc('week', start_at at time zone 'Europe/Madrid') + interval '5 days 23 hours 59 minutes') at time zone 'Europe/Madrid')) then raise exception 'El plazo de alineación ha terminado'; end if;
 if array_length(starters,1) <> 6 then raise exception 'Debes elegir exactamente 6 titulares'; end if;
 if captain is null or not captain=any(starters) then raise exception 'El capitán debe ser titular'; end if;
 select count(*) into owned_count from public.fantasy_roster_players where fantasy_team_id=target_team and player_id=any(starters);
 if owned_count <> 6 then raise exception 'Todos los titulares deben pertenecer a tu plantilla'; end if;
 insert into public.fantasy_lineups(fantasy_team_id,matchday_id,captain_multiplier) values(target_team,target_matchday,1.5)
 on conflict(fantasy_team_id,matchday_id) do update set saved_at=now(),locked_at=null returning id into saved_lineup_id;
 delete from public.fantasy_lineup_players flp where flp.lineup_id=saved_lineup_id;
 insert into public.fantasy_lineup_players(lineup_id,player_id,real_team_id,player_name,is_starter,is_captain)
 select saved_lineup_id,r.player_id,p.team_id,p.name,true,r.player_id=captain from public.fantasy_roster_players r join public.players p on p.id=r.player_id where r.fantasy_team_id=target_team and r.player_id=any(starters);
end $$;
revoke all on function public.save_lineup(uuid,uuid,uuid[],uuid) from public,anon;
grant execute on function public.save_lineup(uuid,uuid,uuid[],uuid) to authenticated;

-- Secure purchase and sale operations for the participant's fantasy team.
create or replace function public.buy_player(target_fantasy_team uuid, target_player uuid)
returns void language plpgsql security definer set search_path='' as $$
declare team_row public.fantasy_teams; player_row public.players; config public.app_config;
begin
 if extract(isodow from now() at time zone 'Europe/Madrid') > 5 or (extract(isodow from now() at time zone 'Europe/Madrid') = 1 and (now() at time zone 'Europe/Madrid')::time < time '01:00') or (extract(isodow from now() at time zone 'Europe/Madrid') = 5 and (now() at time zone 'Europe/Madrid')::time >= time '23:59') then raise exception 'El mercado está cerrado'; end if;
 select * into strict team_row from public.fantasy_teams where id=target_fantasy_team and user_id=auth.uid() for update;
 if not exists(select 1 from public.market_offers where player_id=target_player and week_start=date_trunc('week',now() at time zone 'Europe/Madrid')::date) then raise exception 'El jugador no está en el mercado de esta semana'; end if;
 select * into strict player_row from public.players where id=target_player and status='ACTIVE';
 select * into strict config from public.app_config where id=true;
 if (select count(*) from public.fantasy_roster_players where fantasy_team_id=team_row.id) >= config.squad_size then raise exception 'La plantilla ya tiene 10 jugadores'; end if;
 if exists(select 1 from public.fantasy_roster_players where player_id=target_player) then raise exception 'El jugador ya pertenece a otra plantilla'; end if;
 if team_row.budget < player_row.market_value then raise exception 'Presupuesto insuficiente'; end if;
 update public.fantasy_teams set budget=budget-player_row.market_value where id=team_row.id;
 insert into public.fantasy_roster_players(fantasy_team_id,league_id,player_id,purchase_price) values(team_row.id,team_row.league_id,player_row.id,player_row.market_value);
 insert into public.fantasy_transactions(fantasy_team_id,player_id,type,amount) values(team_row.id,player_row.id,'BUY',player_row.market_value);
end $$;

create or replace function public.sell_player(target_fantasy_team uuid, target_player uuid)
returns void language plpgsql security definer set search_path='' as $$
declare team_row public.fantasy_teams; roster_row public.fantasy_roster_players;
begin
 if extract(isodow from now() at time zone 'Europe/Madrid') > 5 or (extract(isodow from now() at time zone 'Europe/Madrid') = 1 and (now() at time zone 'Europe/Madrid')::time < time '01:00') or (extract(isodow from now() at time zone 'Europe/Madrid') = 5 and (now() at time zone 'Europe/Madrid')::time >= time '23:59') then raise exception 'El mercado está cerrado'; end if;
 select * into strict team_row from public.fantasy_teams where id=target_fantasy_team and user_id=auth.uid() for update;
 select * into strict roster_row from public.fantasy_roster_players where fantasy_team_id=team_row.id and player_id=target_player for update;
 delete from public.fantasy_roster_players where fantasy_team_id=team_row.id and player_id=target_player;
 update public.fantasy_teams set budget=budget+roster_row.purchase_price where id=team_row.id;
 insert into public.fantasy_transactions(fantasy_team_id,player_id,type,amount) values(team_row.id,target_player,'SELL',roster_row.purchase_price);
end $$;

revoke all on function public.buy_player(uuid,uuid), public.sell_player(uuid,uuid) from public,anon;
grant execute on function public.buy_player(uuid,uuid), public.sell_player(uuid,uuid) to authenticated;


