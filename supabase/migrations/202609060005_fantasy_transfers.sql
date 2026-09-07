-- Secure purchase and sale operations for the participant's fantasy team.
create or replace function public.buy_player(target_fantasy_team uuid, target_player uuid)
returns void language plpgsql security definer set search_path='' as $$
declare team_row public.fantasy_teams; player_row public.players; config public.app_config;
begin
 select * into strict team_row from public.fantasy_teams where id=target_fantasy_team and user_id=auth.uid() for update;
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
 select * into strict team_row from public.fantasy_teams where id=target_fantasy_team and user_id=auth.uid() for update;
 select * into strict roster_row from public.fantasy_roster_players where fantasy_team_id=team_row.id and player_id=target_player for update;
 delete from public.fantasy_roster_players where fantasy_team_id=team_row.id and player_id=target_player;
 update public.fantasy_teams set budget=budget+roster_row.purchase_price where id=team_row.id;
 insert into public.fantasy_transactions(fantasy_team_id,player_id,type,amount) values(team_row.id,target_player,'SELL',roster_row.purchase_price);
end $$;

revoke all on function public.buy_player(uuid,uuid), public.sell_player(uuid,uuid) from public,anon;
grant execute on function public.buy_player(uuid,uuid), public.sell_player(uuid,uuid) to authenticated;
