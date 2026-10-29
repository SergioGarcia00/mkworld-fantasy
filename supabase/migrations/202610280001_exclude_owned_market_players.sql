-- Only free agents in the official league may enter the daily market.
create or replace function public.generate_weekly_market(target_season uuid, target_week date default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  market_date date := coalesce(target_week, (now() at time zone 'Europe/Madrid')::date);
  playoff_teams text[] := array[
    'Rozando la Katástrofe','Clarity','Battle Alliance','brilliant','Solar Storm','Urumyans',
    'Cool Kids','Jackpot','The Squirrel Squad','Starstruck 2','Kartvengers Team Alpha',
    'Archon Accelerators','Lycoris','Midnight Wasps','STAKATAKA','KartsRapaces Blues',
    'Solarblitz','RKU','Cyneria Esport','KARTNIVOROS','The Acorn Academy','Ignition',
    'Capybara Skies','Jet Joker Neo','Afterparty','KVT2','Rozando la Katástrofe Eclipse',
    'Space Dementia'
  ];
begin
  delete from public.market_offers where season_id = target_season and week_start = market_date;
  with eligible as (
    select distinct on (p.team_id) p.id, p.team_id, p.mmr
    from public.players p join public.teams t on t.id = p.team_id
    where p.status = 'ACTIVE' and p.mmr is not null and trim(t.name) = any(playoff_teams)
      and not exists (
        select 1
        from public.fantasy_roster_players r
        join public.leagues l on l.id = r.league_id
        join public.app_config cfg on cfg.official_league_id = l.id and cfg.id = true
        where r.player_id = p.id and l.season_id = target_season
      )
    order by p.team_id, random()
  ), picks as (
    select id, mmr, row_number() over(order by random())::integer slot
    from eligible order by random() limit 10
  )
  insert into public.market_offers(season_id, week_start, slot, player_id, mmr)
  select target_season, market_date, slot, id, mmr from picks;
  return (select count(*) from public.market_offers where season_id = target_season and week_start = market_date);
end $$;

