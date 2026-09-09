-- Totales demo para plantillas sin alineación histórica guardada.
insert into public.fantasy_team_matchday_scores (fantasy_team_id, matchday_id, points, scoring_rule_id)
select
  f.id,
  d.id,
  120 + (('x' || substr(md5(f.id || '-' || d.number), 1, 4))::bit(16)::int % 120),
  (select id from public.scoring_rules where season_id = d.season_id order by version desc limit 1)
from public.fantasy_teams f
cross join public.matchdays d
where d.season_id = '00000000-0000-4000-8000-000000000003'::uuid
  and d.number in (2, 3, 4)
on conflict (fantasy_team_id, matchday_id) do update
set points = excluded.points, scoring_rule_id = excluded.scoring_rule_id, processed_at = now();
