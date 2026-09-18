-- Public roster directory. It intentionally excludes budgets, account ids and transactions.
create or replace function public.spectator_users()
returns table(
  fantasy_team_id uuid,
  fantasy_team_name text,
  participant_name text,
  player_id uuid,
  purchase_price bigint,
  clause_protection_amount bigint,
  clause_protected_until timestamptz,
  player_name text,
  player_slug text,
  player_mmr integer,
  player_market_value bigint,
  real_team_name text
)
language sql stable security definer set search_path = '' as $$
  select f.id,
    f.name,
    p.display_name,
    r.player_id,
    r.purchase_price,
    r.clause_protection_amount,
    r.clause_protected_until,
    pl.name,
    pl.slug,
    pl.mmr,
    pl.market_value,
    rt.name
  from public.fantasy_teams f
  join public.leagues l on l.id = f.league_id
  join public.app_config c on c.official_league_id = l.id
  join public.profiles p on p.id = f.user_id
  left join public.fantasy_roster_players r on r.fantasy_team_id = f.id
  left join public.players pl on pl.id = r.player_id
  left join public.teams rt on rt.id = pl.team_id
  where l.is_public
  order by f.name, pl.name nulls last;
$$;
revoke all on function public.spectator_users() from public;
grant execute on function public.spectator_users() to anon, authenticated;
