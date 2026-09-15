-- La economía oficial usa un presupuesto de 1 M€ y precios legibles en miles.
alter table public.app_config
  add column if not exists economy_normalized boolean not null default false;

update public.players
set market_value = least(150000, greatest(15000,
      round((20000 + coalesce(mmr, 5000) * 10)::numeric / 1000) * 1000)::bigint),
    initial_value = least(150000, greatest(15000,
      round((20000 + coalesce(mmr, 5000) * 10)::numeric / 1000) * 1000)::bigint);

update public.fantasy_roster_players rp
set purchase_price = p.market_value
from public.players p
where p.id = rp.player_id;

update public.fantasy_teams f
set budget = greatest(0, 1000000 - coalesce((
  select sum(rp.purchase_price)
  from public.fantasy_roster_players rp
  where rp.fantasy_team_id = f.id
), 0));

update public.leagues set starting_budget = 1000000;
update public.app_config
set starting_budget = 1000000,
    initial_player_value = 60000,
    economy_normalized = true
where id = true;

