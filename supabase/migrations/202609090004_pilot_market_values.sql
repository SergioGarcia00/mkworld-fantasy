-- Forward-only market value history with one update per pilot and jornada.
alter table public.player_market_value_history
  add column if not exists round_id uuid references public.matchdays(id),
  add column if not exists performance_factor numeric,
  add column if not exists demand_factor numeric,
  add column if not exists mmr_factor numeric,
  add column if not exists raw_change_percent numeric,
  add column if not exists applied_change_percent numeric,
  add column if not exists metadata jsonb;
create unique index if not exists player_market_value_round_once
  on public.player_market_value_history(player_id, round_id) where round_id is not null;
alter table public.app_config add column if not exists minimum_pilot_market_value bigint not null default 500000 check (minimum_pilot_market_value >= 0);
alter table public.app_config add column if not exists pilot_value_recent_rounds integer not null default 3 check (pilot_value_recent_rounds > 0);
alter table public.app_config add column if not exists pilot_market_value_rounding bigint not null default 50000 check (pilot_market_value_rounding > 0);

create or replace function public.update_pilot_market_values(target_matchday uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare p record; cfg public.app_config; avg_points numeric; current_points numeric; perf numeric; demand numeric; raw numeric; applied numeric; old_value bigint; new_value bigint; bidders numeric; active_teams numeric; changed integer:=0;
begin
 if not public.is_admin() then raise exception 'Solo administradores'; end if;
 select * into strict cfg from public.app_config where id=true;
 select coalesce(avg(points),0) into avg_points from public.player_matchday_scores where matchday_id=target_matchday;
 select count(*) into active_teams from public.fantasy_teams;
 for p in select id,market_value,mmr from public.players where status='ACTIVE' loop
   if exists(select 1 from public.player_market_value_history where player_id=p.id and round_id=target_matchday) then continue; end if;
   select coalesce(sum(points),0) into current_points from public.player_matchday_scores where player_id=p.id and matchday_id=target_matchday;
   perf := case when avg_points > 0 then (current_points-avg_points)/avg_points else 0 end;
   select count(distinct fantasy_team_id) into bidders from public.market_bids where player_id=p.id;
   demand := case when active_teams > 0 then bidders/active_teams - 0.25 else 0 end;
   raw := greatest(-cfg.max_weekly_value_change_percent, least(cfg.max_weekly_value_change_percent, perf*4 + demand*3));
   old_value := p.market_value; new_value := greatest(cfg.minimum_pilot_market_value, round((old_value*(1+raw/100))/cfg.pilot_market_value_rounding)*cfg.pilot_market_value_rounding);
   update public.players set market_value=new_value where id=p.id;
   insert into public.player_market_value_history(player_id,round_id,value,variation,percentage_change,reason,performance_factor,demand_factor,mmr_factor,raw_change_percent,applied_change_percent,metadata)
   values(p.id,target_matchday,new_value,new_value-old_value,case when old_value=0 then null else (new_value-old_value)*100.0/old_value end,'Revalorización de jornada',perf*4,demand*3,0,perf*4+demand*3,raw,jsonb_build_object('points',current_points,'averagePoints',avg_points,'bidders',bidders));
   changed:=changed+1;
 end loop; return changed;
end $$;
revoke all on function public.update_pilot_market_values(uuid) from public,anon,authenticated;
grant execute on function public.update_pilot_market_values(uuid) to service_role;

-- Keep publication and revaluation in the same admin-triggered flow.
create or replace function public.admin_set_matchday_status(target_matchday uuid,new_status public.matchday_status)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Solo administradores'; end if;
 update public.matchdays set status=new_status where id=target_matchday;
 if not found then raise exception 'Jornada no encontrada'; end if;
 if new_status='FINISHED' then
   perform public.finalize_round_economy(target_matchday);
   perform public.update_pilot_market_values(target_matchday);
 end if;
end $$;
