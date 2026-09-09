import type {
  AppConfig,
  Player,
  Team,
  Season,
  Profile,
  PlayerStatistics,
  MarketHistory,
  PublicLeague,
  PublicStanding,
  PublicMatchday,
  LeagueVisibility,
  OfficialLeague,
} from '@/domain/models';
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type RecordRow<Row extends object> = { [Key in keyof Row]: Row[Key] };
type Table<Row extends object> = {
  Row: RecordRow<Row>;
  Insert: Partial<RecordRow<Row>>;
  Update: Partial<RecordRow<Row>>;
  Relationships: [];
};
// Phase 1 client contract. Generate the complete schema with npm run db:types.
export type Database = {
  public: {
    Tables: {
      news_posts: Table<{
        id: string;
        title: string;
        body: string;
        category: string;
        created_at: string;
        published: boolean;
      }>;
      matchdays: Table<{
        id: string;
        number: number;
        name: string;
        status: string;
        start_at: string;
        end_at: string;
      }>;
      chat_messages: Table<{
        id: string;
        user_id: string;
        body: string;
        created_at: string;
        deleted_at: string | null;
      }>;
      players: Table<Player>;
      teams: Table<Team>;
      seasons: Table<Season>;
      profiles: Table<Profile>;
      app_config: Table<AppConfig>;
      player_market_value_history: Table<MarketHistory>;
      leagues: Table<LeagueVisibility>;
    };
    Views: { player_statistics: { Row: RecordRow<PlayerStatistics>; Relationships: [] } };
    Functions: {
      public_player_weekly_stats: {
        Args: Record<string, never>;
        Returns: { player_id: string; total_points: number; entries: number }[];
      };
      spectator_chat: {
        Args: Record<string, never>;
        Returns: { id: string; body: string; created_at: string; display_name: string }[];
      };
      import_players: { Args: { payload: Json; target_season: string }; Returns: Json };
      spectator_leagues: { Args: Record<string, never>; Returns: RecordRow<PublicLeague>[] };
      spectator_standings: {
        Args: { target_matchday?: string | null };
        Returns: RecordRow<PublicStanding>[];
      };
      spectator_matchdays: {
        Args: Record<string, never>;
        Returns: RecordRow<PublicMatchday>[];
      };
      official_league: { Args: Record<string, never>; Returns: RecordRow<OfficialLeague>[] };
      set_participant_access: {
        Args: { target_user: string; enabled: boolean };
        Returns: undefined;
      };
      set_league_publication: {
        Args: { target_league: string; published: boolean };
        Returns: undefined;
      };
      initialize_official_league: {
        Args: { league_name: string; target_season: string };
        Returns: string;
      };
      enroll_official_participant: {
        Args: { target_user: string; team_name: string };
        Returns: undefined;
      };
    };
    Enums: { user_role: 'USER' | 'ADMIN' };
    CompositeTypes: Record<string, never>;
  };
};
