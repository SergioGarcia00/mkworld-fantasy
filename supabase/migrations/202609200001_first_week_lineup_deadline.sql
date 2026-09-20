create or replace function public.save_lineup(target_team uuid, target_matchday uuid, starters uuid[], captain uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare saved_lineup_id uuid; owned_count integer; roster_count integer; current_budget bigint; lineup_deadline timestamptz;
begin
 if not exists(select 1 from public.fantasy_teams where id=target_team and user_id=auth.uid()) then raise exception 'Equipo no autorizado'; end if;
 select count(*) into roster_count from public.fantasy_roster_players where fantasy_team_id=target_team;
 select budget into current_budget from public.fantasy_teams where id=target_team;
 if roster_count < 6 or roster_count > 10 then raise exception 'Debes tener entre 6 y 10 jugadores antes de confirmar la alineacion'; end if;
 if current_budget < 0 then raise exception 'Debes tener un presupuesto de 0 EUR o mas antes de confirmar la alineacion'; end if;
 if (select test_mode from public.app_config where id=true) then
   if not exists(select 1 from public.app_config c join public.matchdays m on m.id=c.test_matchday_id where c.id=true and c.test_lineup_open and m.id=target_matchday and m.status<>'FINISHED') then raise exception 'Alineaciones cerradas por administracion'; end if;
 else
   if exists(select 1 from public.matchdays where id=target_matchday and status in ('LOCKED','FINISHED')) then raise exception 'La jornada esta cerrada'; end if;
   if (select first_week_mode and first_week_market_date is not null from public.app_config where id=true) then
     select least(lock_at, ((select first_week_market_date from public.app_config where id=true) || ' 19:00:00+02')::timestamptz) into lineup_deadline from public.matchdays where id=target_matchday;
   else
     select least(lock_at,(date_trunc('week',start_at at time zone 'Europe/Madrid') + interval '5 days 23 hours 59 minutes') at time zone 'Europe/Madrid') into lineup_deadline from public.matchdays where id=target_matchday;
   end if;
   if now() >= lineup_deadline then raise exception 'El plazo de alineacion ha terminado'; end if;
 end if;
 if array_length(starters,1) <> 6 then raise exception 'Debes elegir exactamente 6 titulares'; end if;
 if captain is null or not captain=any(starters) then raise exception 'El capitan debe ser titular'; end if;
 select count(*) into owned_count from public.fantasy_roster_players where fantasy_team_id=target_team and player_id=any(starters);
 if owned_count <> 6 then raise exception 'Todos los titulares deben pertenecer a tu plantilla'; end if;
 insert into public.fantasy_lineups(fantasy_team_id,matchday_id,captain_multiplier) values(target_team,target_matchday,1.5)
 on conflict(fantasy_team_id,matchday_id) do update set saved_at=now(),locked_at=null returning id into saved_lineup_id;
 delete from public.fantasy_lineup_players where lineup_id=saved_lineup_id;
 insert into public.fantasy_lineup_players(lineup_id,player_id,real_team_id,player_name,is_starter,is_captain)
 select saved_lineup_id,r.player_id,p.team_id,p.name,true,r.player_id=captain from public.fantasy_roster_players r join public.players p on p.id=r.player_id where r.fantasy_team_id=target_team and r.player_id=any(starters);
end $$;

revoke all on function public.save_lineup(uuid,uuid,uuid[],uuid) from public, anon;
grant execute on function public.save_lineup(uuid,uuid,uuid[],uuid) to authenticated;
