-- Presupuesto oficial reducido: los importes se expresan en miles de euros.
update public.players
set market_value = least(5000, greatest(1000,
      round((500 + coalesce(mmr, 5000) * 0.5)::numeric / 100) * 100)::bigint),
    initial_value = least(5000, greatest(1000,
      round((500 + coalesce(mmr, 5000) * 0.5)::numeric / 100) * 100)::bigint);

update public.fantasy_roster_players rp
set purchase_price = p.market_value
from public.players p
where p.id = rp.player_id;

update public.fantasy_teams f
set budget = greatest(0, 25000 - coalesce((
  select sum(rp.purchase_price)
  from public.fantasy_roster_players rp
  where rp.fantasy_team_id = f.id
), 0));

update public.leagues set starting_budget = 25000;
update public.app_config
set starting_budget = 25000,
    initial_player_value = 3000,
    economy_normalized = true
where id = true;

