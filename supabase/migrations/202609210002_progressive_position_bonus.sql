-- Progressive inverted bonus: last place gets the maximum and every higher
-- position receives 150 EUR less.
alter table public.app_config
  add column if not exists last_place_bonus bigint not null default 2000 check (last_place_bonus >= 0),
  add column if not exists position_bonus_step bigint not null default 150 check (position_bonus_step >= 0);

create or replace function public.finalize_round_economy(target_matchday uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare row record; cfg public.app_config; before_balance bigint; reward bigint; created integer:=0; pos_bonus bigint;
begin
 if not public.is_admin() then raise exception 'Solo administradores'; end if;
 select * into strict cfg from public.app_config where id=true;
 perform public.calculate_matchday_scores(target_matchday);
 for row in
   select s.fantasy_team_id,s.points,ft.league_id,
          row_number() over(order by s.points asc, s.fantasy_team_id) as position,
          exists(select 1 from public.fantasy_lineups l where l.fantasy_team_id=s.fantasy_team_id and l.matchday_id=target_matchday) as participated
   from public.fantasy_team_matchday_scores s join public.fantasy_teams ft on ft.id=s.fantasy_team_id
   where s.matchday_id=target_matchday order by s.points asc, s.fantasy_team_id
 loop
   reward := least(greatest(0, floor(row.points)::bigint) * cfg.money_per_point, cfg.max_money_from_points_per_round);
   select budget into before_balance from public.fantasy_teams where id=row.fantasy_team_id for update;
   update public.fantasy_teams set budget=budget+reward where id=row.fantasy_team_id;
   insert into public.fantasy_transactions(fantasy_team_id,round_id,type,amount,balance_before,balance_after,description,metadata,idempotency_key)
   values(row.fantasy_team_id,target_matchday,'ROUND_POINTS_REWARD',reward,before_balance,before_balance+reward,'Recompensa por '||row.points||' puntos',jsonb_build_object('points',row.points,'moneyPerPoint',cfg.money_per_point,'appliedReward',reward),'round:'||target_matchday||':team:'||row.fantasy_team_id||':points') on conflict do nothing;
   if found then created:=created+1; else update public.fantasy_teams set budget=budget-reward where id=row.fantasy_team_id; end if;
   if row.participated then
     select budget into before_balance from public.fantasy_teams where id=row.fantasy_team_id for update;
     update public.fantasy_teams set budget=budget+cfg.participation_bonus where id=row.fantasy_team_id;
     insert into public.fantasy_transactions(fantasy_team_id,round_id,type,amount,balance_before,balance_after,description,metadata,idempotency_key)
     values(row.fantasy_team_id,target_matchday,'ROUND_PARTICIPATION_BONUS',cfg.participation_bonus,before_balance,before_balance+cfg.participation_bonus,'Bonus de participación',jsonb_build_object('validLineup',true),'round:'||target_matchday||':team:'||row.fantasy_team_id||':participation') on conflict do nothing;
     if not found then update public.fantasy_teams set budget=budget-cfg.participation_bonus where id=row.fantasy_team_id; end if;
   end if;
   pos_bonus := greatest(0, cfg.last_place_bonus - ((row.position - 1) * cfg.position_bonus_step));
   if pos_bonus > 0 then
     select budget into before_balance from public.fantasy_teams where id=row.fantasy_team_id for update;
     update public.fantasy_teams set budget=budget+pos_bonus where id=row.fantasy_team_id;
     insert into public.fantasy_transactions(fantasy_team_id,round_id,type,amount,balance_before,balance_after,description,metadata,idempotency_key)
     values(row.fantasy_team_id,target_matchday,'ROUND_POSITION_BONUS',pos_bonus,before_balance,before_balance+pos_bonus,row.position||'º puesto (bonus invertido)',jsonb_build_object('position',row.position,'roundPoints',row.points,'bonus',pos_bonus,'inverted',true,'base',cfg.last_place_bonus,'step',cfg.position_bonus_step),'round:'||target_matchday||':team:'||row.fantasy_team_id||':position') on conflict do nothing;
     if not found then update public.fantasy_teams set budget=budget-pos_bonus where id=row.fantasy_team_id; end if;
   end if;
 end loop;
 return created;
end $$;
