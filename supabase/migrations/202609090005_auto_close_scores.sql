-- Substitutes may legitimately score below the normal 12 point floor.
alter table public.player_weekly_inputs drop constraint if exists player_weekly_inputs_game_one_check;
alter table public.player_weekly_inputs drop constraint if exists player_weekly_inputs_game_two_check;
alter table public.player_weekly_inputs add constraint player_weekly_inputs_game_one_check check (game_one between 0 and 180);
alter table public.player_weekly_inputs add constraint player_weekly_inputs_game_two_check check (game_two is null or game_two between 0 and 180);

-- The RPC remains inaccessible to participants; it is invoked only by the trigger below.
create or replace function public.auto_close_matchday_when_complete()
returns trigger language plpgsql security definer set search_path='' as $$
declare total_teams integer; complete_teams integer; match_status public.matchday_status;
begin
 select status into match_status from public.matchdays where id=new.matchday_id for update;
 if match_status <> 'OPEN' then return new; end if;
 select count(*) into total_teams from public.fantasy_teams;
 select count(*) into complete_teams
 from public.fantasy_teams ft
 where exists(select 1 from public.fantasy_lineups l where l.fantasy_team_id=ft.id and l.matchday_id=new.matchday_id)
 and (select count(*) from public.fantasy_lineup_players lp join public.player_weekly_inputs i on i.player_id=lp.player_id and i.fantasy_team_id=ft.id and i.matchday_id=new.matchday_id where lp.lineup_id=(select l2.id from public.fantasy_lineups l2 where l2.fantasy_team_id=ft.id and l2.matchday_id=new.matchday_id limit 1) and lp.is_starter and i.game_one is not null and i.game_two is not null)=6;
 if total_teams > 0 and complete_teams = total_teams then
   update public.matchdays set status='FINISHED' where id=new.matchday_id and status='OPEN';
   -- Rewards and market values are deliberately finalized by the admin flow;
   -- this trigger only closes score entry once every lineup is complete.
 end if;
 return new;
end $$;
drop trigger if exists close_matchday_when_scores_complete on public.player_weekly_inputs;
create trigger close_matchday_when_scores_complete after insert or update on public.player_weekly_inputs for each row execute function public.auto_close_matchday_when_complete();
