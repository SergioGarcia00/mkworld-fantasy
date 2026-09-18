-- Durante la primera semana una adjudicación puede dejar saldo negativo.
-- La alineación se bloquea hasta tener exactamente 10 jugadores y el saldo
-- puede regularizarse con ventas antes de confirmar.
alter table public.fantasy_teams
  drop constraint if exists fantasy_teams_budget_check;
