-- Atomic economy operations. Amounts remain integer euros.
alter table public.fantasy_transactions add column if not exists idempotency_key text;
create unique index if not exists fantasy_transactions_idempotency_idx
  on public.fantasy_transactions(fantasy_team_id, idempotency_key)
  where idempotency_key is not null;

create or replace function public.sell_player(target_fantasy_team uuid, target_player uuid)
returns void language plpgsql security definer set search_path='' as $$
declare team_row public.fantasy_teams; roster_row public.fantasy_roster_players; player_value bigint; sale_price bigint; before_balance bigint; config_row public.app_config;
begin
 select * into strict team_row from public.fantasy_teams where id=target_fantasy_team and user_id=auth.uid() for update;
 select * into strict roster_row from public.fantasy_roster_players where fantasy_team_id=team_row.id and player_id=target_player for update;
 select market_value into strict player_value from public.players where id=target_player;
 select * into strict config_row from public.app_config where id=true;
 sale_price := floor(player_value * config_row.market_sell_percentage / 100);
 before_balance := team_row.budget;
 delete from public.fantasy_roster_players where fantasy_team_id=team_row.id and player_id=target_player;
 update public.fantasy_teams set budget=budget+sale_price where id=team_row.id;
 insert into public.fantasy_transactions(fantasy_team_id,player_id,type,amount,balance_before,balance_after,description,metadata,idempotency_key)
 values(team_row.id,target_player,'PILOT_MARKET_SALE',sale_price,before_balance,before_balance+sale_price,'Venta inmediata al mercado',jsonb_build_object('marketValue',player_value,'sellPercentage',config_row.market_sell_percentage,'salePrice',sale_price), 'sale:'||target_player::text);
end $$;
revoke all on function public.sell_player(uuid,uuid) from public,anon;
grant execute on function public.sell_player(uuid,uuid) to authenticated;

create or replace function public.economy_net_worth(target_team uuid)
returns bigint language sql stable security definer set search_path='' as $$
 select f.budget + coalesce((select sum(p.market_value) from public.fantasy_roster_players r join public.players p on p.id=r.player_id where r.fantasy_team_id=f.id),0)
 from public.fantasy_teams f where f.id=target_team;
$$;
revoke all on function public.economy_net_worth(uuid) from public,anon;
grant execute on function public.economy_net_worth(uuid) to authenticated;

create policy economy_transactions_owner on public.fantasy_transactions for select to authenticated
  using (exists(select 1 from public.fantasy_teams f where f.id=fantasy_team_id and (f.user_id=auth.uid() or public.is_admin())));
