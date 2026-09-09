-- Resultados demo reproducibles: dos carreras finalizadas por cada jornada.
with selected_teams as (
  select id, row_number() over (order by name, id) as position
  from public.teams
  limit 4
), pairs as (
  select 1 as race_no, h.id as home_id, a.id as away_id
  from selected_teams h
  join selected_teams a on a.position = 2
  where h.position = 1
  union all
  select 2, h.id, a.id
  from selected_teams h
  join selected_teams a on a.position = 4
  where h.position = 3
), demo_days as (
  select id, number
  from public.matchdays
  where season_id = '00000000-0000-4000-8000-000000000003'::uuid
    and number between 1 and 4
)
insert into public.matches(matchday_id, home_team_id, away_team_id, scheduled_at, status, home_score, away_score)
select
  d.id,
  p.home_id,
  p.away_id,
  now() - ((5 - d.number) * interval '7 days') + (p.race_no - 1) * interval '3 hours',
  'FINISHED'::public.match_status,
  (('x' || substr(md5('home-' || d.number || '-' || p.race_no), 1, 2))::bit(8)::int % 8),
  (('x' || substr(md5('away-' || d.number || '-' || p.race_no), 1, 2))::bit(8)::int % 8)
from demo_days d
cross join pairs p
where not exists (
  select 1 from public.matches existing
  where existing.matchday_id = d.id and existing.scheduled_at = now() - ((5 - d.number) * interval '7 days') + (p.race_no - 1) * interval '3 hours'
);

update public.matchdays
set status = 'FINISHED'::public.matchday_status
where season_id = '00000000-0000-4000-8000-000000000003'::uuid
  and number between 1 and 4;
