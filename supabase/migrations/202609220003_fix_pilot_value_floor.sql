-- Pilot values in this fantasy use small integer euro amounts (not hundreds
-- of thousands). Keep revaluation steps aligned with the catalogue scale.
alter table public.app_config
  alter column minimum_pilot_market_value set default 500,
  alter column pilot_market_value_rounding set default 500;

update public.app_config
set minimum_pilot_market_value = 500,
    pilot_market_value_rounding = 500
where id = true;
