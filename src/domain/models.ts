export interface Team {
  id: string;
  source_key: string;
  name: string;
  tag: string;
  slug: string;
  color: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}
export interface Player {
  id: string;
  source_key: string;
  name: string;
  slug: string;
  team_id: string;
  nationality: string | null;
  avatar_url: string | null;
  mkcentral_player_id: string | null;
  market_value: number;
  initial_value: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
}
export interface Season {
  id: string;
  name: string;
  slug: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}
export interface Profile {
  id: string;
  display_name: string;
  role: 'USER' | 'ADMIN';
  access_enabled: boolean;
  created_at: string;
}
export interface AppConfig {
  test_mode?: boolean;
  test_market_open?: boolean;
  test_lineup_open?: boolean;
  test_scores_open?: boolean;
  test_matchday_id?: string | null;
  test_market_week?: string | null;
  id: boolean;
  starting_budget: number;
  initial_player_value: number;
  squad_size: number;
  starter_size: number;
  max_players_same_real_team: number;
  captain_multiplier: number;
  official_league_id?: string | null;
}
export interface PlayerStatistics {
  player_id: string;
  total_points: number;
  average_points: number;
  matches_played: number;
}
export interface MarketHistory {
  id: string;
  player_id: string;
  value: number;
  variation: number;
  percentage_change: number | null;
  reason: string;
  timestamp: string;
}
export interface Catalog {
  players: Player[];
  teams: Team[];
  stats: PlayerStatistics[];
  seasons: Season[];
  mode: 'database' | 'preview';
  config: AppConfig;
}
export type ActionState = { error?: string; success?: string };
export interface PublicLeague {
  id: string;
  name: string;
  season_name: string;
  participants: number;
}
export interface PublicStanding {
  position: number;
  fantasy_team_id: string;
  participant_name: string;
  fantasy_team_name: string;
  total_points: number;
  last_matchday_points: number;
}
export interface PublicMatchday {
  id: string;
  number: number;
  name: string;
}
export interface LeagueVisibility {
  id: string;
  name: string;
  is_public: boolean;
}
export interface OfficialLeague extends PublicLeague {
  is_public: boolean;
}
