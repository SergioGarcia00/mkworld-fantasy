import 'server-only';
import { cache } from 'react';
import { createHash } from 'node:crypto';
import source from '../../data/mkcentral-743-registrations.json';
import { mapImport } from '@/services/mkcentral/player-mapper';
import { DEFAULT_CONFIG, SEASON_ID } from '@/domain/config';
import type { Catalog, Team, Player, PlayerStatistics } from '@/domain/models';
import { isConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
const stableId = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 24);
export const getCatalog = cache(async (includeStats = true): Promise<Catalog> => {
  if (!isConfigured()) {
    const rows = mapImport(source);
    const teams = new Map<string, Team>();
    const players: Player[] = [];
    for (const r of rows) {
      const tid = stableId(r.teamKey),
        pid = stableId(r.sourceKey);
      teams.set(tid, {
        id: tid,
        source_key: r.teamKey,
        name: r.teamName,
        tag: r.teamTag,
        slug: `${r.teamSlugBase}-${tid}`,
        color: null,
        logo_url: null,
        created_at: '2026-09-06T00:00:00Z',
        updated_at: '2026-09-06T00:00:00Z',
      });
      players.push({
        id: pid,
        source_key: r.sourceKey,
        name: r.name,
        slug: `${r.slugBase}-${pid}`,
        team_id: tid,
        nationality: null,
        avatar_url: null,
        mkcentral_player_id: r.mkcentralId,
        market_value: DEFAULT_CONFIG.initial_player_value,
        initial_value: DEFAULT_CONFIG.initial_player_value,
        status: 'ACTIVE',
        created_at: '2026-09-06T00:00:00Z',
        updated_at: '2026-09-06T00:00:00Z',
      });
    }
    return {
      players,
      teams: [...teams.values()],
      stats: [],
      seasons: [
        {
          id: SEASON_ID,
          name: 'Atlas League Season 3',
          slug: 'atlas-league-season-3',
          starts_at: null,
          ends_at: null,
          created_at: '2026-09-06T00:00:00Z',
        },
      ],
      mode: 'preview',
      config: DEFAULT_CONFIG,
    };
  }
  const db = await createClient();
  const [players, teams, stats, seasons, config] = await Promise.all([
    readAllPlayers(),
    db.from('teams').select('*').order('name').limit(10000),
    includeStats ? readAllStats() : Promise.resolve([] as PlayerStatistics[]),
    db.from('seasons').select('*').order('created_at', { ascending: false }),
    db.from('app_config').select('*').single(),
  ]);
  if (teams.error || seasons.error || config.error)
    throw new Error(
      'No se pudo cargar el catálogo. Revisa la conexión y las migraciones de Supabase.',
    );
  return {
    players,
    teams: teams.data ?? [],
    stats,
    seasons: seasons.data ?? [],
    mode: 'database',
    config: config.data!,
  };
});
async function readAllPlayers() {
  const db = await createClient();
  const all: Player[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from('players')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('id')
      .range(offset, offset + 999);
    if (error) throw new Error('No se pudieron cargar los jugadores.');
    all.push(...data);
    if (data.length < 1000) return all;
  }
}
async function readAllStats() {
  const db = await createClient();
  const all: PlayerStatistics[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from('player_statistics')
      .select('*')
      .order('player_id')
      .range(offset, offset + 999);
    if (error) throw new Error('No se pudieron cargar las estadísticas.');
    all.push(...data);
    if (data.length < 1000) return all;
  }
}
