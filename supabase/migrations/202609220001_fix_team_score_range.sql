-- A team score aggregates six starters across two races, with a captain
-- multiplier. The old 12..360 check rejected valid totals such as 368.
alter table public.fantasy_team_matchday_scores
  drop constraint if exists matchday_scores_points_range;

alter table public.fantasy_team_matchday_scores
  add constraint matchday_scores_points_range
  check (points between 0 and 2340);
