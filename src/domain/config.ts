// Preview/bootstrap defaults. Runtime configuration is read from public.app_config.
export const DEFAULT_CONFIG = {
  id: true,
  starting_budget: 100_000_000,
  initial_player_value: 10_000_000,
  squad_size: 10,
  starter_size: 6,
  max_players_same_real_team: 2,
  captain_multiplier: 1.5,
};
export const SEASON_ID = '00000000-0000-4000-8000-000000000003';
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export function credits(value: number) {
  return (
    new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value / 1_000_000) + ' M'
  );
}
