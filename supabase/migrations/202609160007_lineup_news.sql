-- Publish lineup updates from the latest saved lineups.
with latest as (
  select distinct on (fl.fantasy_team_id) fl.id, fl.fantasy_team_id, fl.matchday_id
  from public.fantasy_lineups fl
  order by fl.fantasy_team_id, fl.saved_at desc
), lineup_news as (
  select ft.name as team_name, coalesce(p.display_name, ft.name) as owner_name,
    md.number as jornada,
    string_agg(case when lp.is_starter then lp.player_name || case when lp.is_captain then ' (capitán)' else '' end end, ', ' order by lp.player_name) as titulares,
    string_agg(case when not lp.is_starter then lp.player_name end, ', ' order by lp.player_name) as reservas
  from latest l
  join public.fantasy_teams ft on ft.id = l.fantasy_team_id
  left join public.profiles p on p.id = ft.user_id
  join public.matchdays md on md.id = l.matchday_id
  join public.fantasy_lineup_players lp on lp.lineup_id = l.id
  where ft.league_id = (select official_league_id from public.app_config where id = true)
  group by ft.name, p.display_name, md.number
)
insert into public.news_posts(title, body, category, published)
select 'Alineación confirmada · ' || team_name,
  owner_name || ' ha confirmado su alineación para la Jornada ' || jornada ||
  '. Titulares: ' || coalesce(titulares, 'Pendientes') ||
  case when reservas is not null then '. Reservas: ' || reservas else '' end,
  'Competición', true
from lineup_news n
where not exists (
  select 1 from public.news_posts x
  where x.title = 'Alineación confirmada · ' || n.team_name
);

insert into public.news_posts(title, body, category, published)
select 'La Jornada 1 ya toma forma',
  'Las primeras alineaciones de Atlas League Fantasy Season 3 ya están confirmadas. Revisa las plantillas y sigue la acción desde la página.',
  'Competición', true
where not exists (select 1 from public.news_posts where title = 'La Jornada 1 ya toma forma');
