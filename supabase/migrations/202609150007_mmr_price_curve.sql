-- Curva de precios más pronunciada: +2.500 € por cada 1.000 MMR.
-- Referencia: 4.000 MMR = 6.000 €; 10.000 MMR = 21.000 €.
update public.players
set market_value = least(25000, greatest(1000,
      round((6000 + (coalesce(mmr, 4000) - 4000) * 2.5)::numeric / 500) * 500)::bigint),
    initial_value = least(25000, greatest(1000,
      round((6000 + (coalesce(mmr, 4000) - 4000) * 2.5)::numeric / 500) * 500)::bigint);

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

update public.app_config
set initial_player_value = 6000
where id = true;

