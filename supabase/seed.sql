insert into public.seasons(id,name,slug) values('00000000-0000-4000-8000-000000000003','Atlas League Season 3','atlas-league-season-3') on conflict(slug) do nothing;
insert into public.scoring_rules(season_id,version,rules)
values('00000000-0000-4000-8000-000000000003',1,'{"baseMultiplier":1,"winBonus":5,"mvpBonus":10,"teamBestBonus":5,"administrativePenalty":0}') on conflict(season_id,version) do nothing;
-- DEMO calendar only, not actual MKCentral fixtures.
insert into public.matchdays(season_id,number,name,start_at,lock_at,end_at)
select '00000000-0000-4000-8000-000000000003',n,'Jornada DEMO '||n,now()+n*interval '7 days',now()+n*interval '7 days'-interval '1 hour',now()+n*interval '7 days'+interval '1 day'
from generate_series(1,4) n on conflict(season_id,number) do nothing;
