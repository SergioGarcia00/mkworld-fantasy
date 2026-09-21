-- Award the round-position bonuses to the lowest scores first.
-- Keep the economy fields present in environments where the original economy
-- migration was not applied yet.
alter table public.app_config
  add column if not exists money_per_point bigint not null default 100 check (money_per_point >= 0),
  add column if not exists max_money_from_points_per_round bigint not null default 12000 check (max_money_from_points_per_round >= 0),
  add column if not exists participation_bonus bigint not null default 2000 check (participation_bonus >= 0),
  add column if not exists first_place_bonus bigint not null default 5000 check (first_place_bonus >= 0),
  add column if not exists second_place_bonus bigint not null default 3000 check (second_place_bonus >= 0),
  add column if not exists third_place_bonus bigint not null default 2000 check (third_place_bonus >= 0);

create or replace function public.finalize_round_economy(target_matchday uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare row record; cfg public.app_config; before_balance bigint; reward bigint; created integer:=0; pos_bonus bigint;
begin
 if not public.is_admin() then raise exception 'Solo administradores'; end if;
 select * into strict cfg from public.app_config where id=true;
 perform public.calculate_matchday_scores(target_matchday);
 for row in
   select s.fantasy_team_id,s.points,ft.league_id,
          rank() over(order by s.points asc) as position,
          exists(select 1 from public.fantasy_lineups l where l.fantasy_team_id=s.fantasy_team_id and l.matchday_id=target_matchday) as participated
   from public.fantasy_team_matchday_scores s join public.fantasy_teams ft on ft.id=s.fantasy_team_id
   where s.matchday_id=target_matchday
   order by s.points asc
 loop
   reward := least(greatest(0, floor(row.points)::bigint) * cfg.money_per_point, cfg.max_money_from_points_per_round);
   select budget into before_balance from public.fantasy_teams where id=row.fantasy_team_id for update;
   update public.fantasy_teams set budget=budget+reward where id=row.fantasy_team_id;
   insert into public.fantasy_transactions(fantasy_team_id,round_id,type,amount,balance_before,balance_after,description,metadata,idempotency_key)
   values(row.fantasy_team_id,target_matchday,'ROUND_POINTS_REWARD',reward,before_balance,before_balance+reward,'Recompensa por '||row.points||' puntos',jsonb_build_object('points',row.points,'moneyPerPoint',cfg.money_per_point,'uncappedReward',greatest(0,floor(row.points)::bigint)*cfg.money_per_point,'maxReward',cfg.max_money_from_points_per_round,'appliedReward',reward),'round:'||target_matchday||':team:'||row.fantasy_team_id||':points') on conflict do nothing;
   if found then created:=created+1; else update public.fantasy_teams set budget=budget-reward where id=row.fantasy_team_id; end if;
   if row.participated then
     select budget into before_balance from public.fantasy_teams where id=row.fantasy_team_id for update;
     update public.fantasy_teams set budget=budget+cfg.participation_bonus where id=row.fantasy_team_id;
     insert into public.fantasy_transactions(fantasy_team_id,round_id,type,amount,balance_before,balance_after,description,metadata,idempotency_key)
     values(row.fantasy_team_id,target_matchday,'ROUND_PARTICIPATION_BONUS',cfg.participation_bonus,before_balance,before_balance+cfg.participation_bonus,'Bonus de participación',jsonb_build_object('validLineup',true),'round:'||target_matchday||':team:'||row.fantasy_team_id||':participation') on conflict do nothing;
     if not found then update public.fantasy_teams set budget=budget-cfg.participation_bonus where id=row.fantasy_team_id; end if;
   end if;
   pos_bonus := case row.position when 1 then cfg.first_place_bonus when 2 then cfg.second_place_bonus when 3 then cfg.third_place_bonus else 0 end;
   if pos_bonus > 0 then
     select budget into before_balance from public.fantasy_teams where id=row.fantasy_team_id for update;
     update public.fantasy_teams set budget=budget+pos_bonus where id=row.fantasy_team_id;
     insert into public.fantasy_transactions(fantasy_team_id,round_id,type,amount,balance_before,balance_after,description,metadata,idempotency_key)
     values(row.fantasy_team_id,target_matchday,'ROUND_POSITION_BONUS',pos_bonus,before_balance,before_balance+pos_bonus,row.position||'º puesto de la jornada (bonus invertido)',jsonb_build_object('position',row.position,'roundPoints',row.points,'bonus',pos_bonus,'inverted',true),'round:'||target_matchday||':team:'||row.fantasy_team_id||':position') on conflict do nothing;
     if not found then update public.fantasy_teams set budget=budget-pos_bonus where id=row.fantasy_team_id; end if;
   end if;
 end loop;
 return created;
end $$;
