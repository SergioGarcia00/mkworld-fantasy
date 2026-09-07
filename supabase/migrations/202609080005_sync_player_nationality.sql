-- Keep the canonical player record populated with the imported country.
update public.players p
set nationality = d.country
from public.player_enriched_details d
where d.player_id = p.id
  and d.season_number = 3
  and d.country is not null
  and (p.nationality is distinct from d.country);
