create or replace function public.calculate_matchday_scores(target_matchday uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare lineup record; total numeric; processed integer:=0; rule_id uuid;
begin
 select id into rule_id from public.scoring_rules sr join public.matchdays md on md.season_id=sr.season_id where md.id=target_matchday order by sr.version desc limit 1;
 for lineup in select l.id,l.fantasy_team_id,l.captain_multiplier from public.fantasy_lineups l where l.matchday_id=target_matchday loop
  select coalesce(sum((i.game_one+coalesce(i.game_two,0)) * case when lp.is_captain then lineup.captain_multiplier else 1 end),0) into total
  from public.fantasy_lineup_players lp join public.player_weekly_inputs i on i.player_id=lp.player_id and i.fantasy_team_id=lineup.fantasy_team_id and i.matchday_id=target_matchday where lp.lineup_id=lineup.id and lp.is_starter;
  insert into public.fantasy_team_matchday_scores(fantasy_team_id,matchday_id,points,scoring_rule_id) values(lineup.fantasy_team_id,target_matchday,total,rule_id)
  on conflict(fantasy_team_id,matchday_id) do update set points=excluded.points,processed_at=now(); processed:=processed+1;
 end loop;
 return processed;
end $$;
