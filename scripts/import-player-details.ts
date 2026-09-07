import { readFile } from 'node:fs/promises';
import { adminClient } from './client';

type SourceRow = {
  player_id: number | string;
  jugador: string;
  equipo: string;
  mkcentral_profile?: string;
  lounge?: {
    profile_id?: number | string;
    name?: string;
    tier?: string;
    country?: string;
    profile_url_12p?: string;
    profile_url_24p?: string;
  };
  season_3?: {
    '12p'?: Record<string, unknown>;
    '24p'?: Record<string, unknown>;
    events?: unknown[];
  };
  collection?: { collected_at?: string; source?: string };
};

const file = process.argv[2];
if (!file) throw new Error('Uso: npm run import:player-details -- <ruta-al-json>');
const source = JSON.parse(await readFile(file, 'utf8')) as { jugadores: SourceRow[] };
const db = adminClient();
const players: { id: string; mkcentral_player_id: string | null }[] = [];
for (let offset = 0; ; offset += 500) {
  const { data, error } = await db.from('players').select('id,mkcentral_player_id').order('id').range(offset, offset + 499);
  if (error) throw error;
  players.push(...(data ?? []));
  if (!data || data.length < 500) break;
}
const ids = new Map((players ?? []).filter((p: { mkcentral_player_id: string | null }) => p.mkcentral_player_id).map((p: { mkcentral_player_id: string | null; id: string }) => [String(p.mkcentral_player_id), p.id]));
const rows = source.jugadores.map((row) => {
  const s12 = row.season_3?.['12p'] ?? {};
  const s24 = row.season_3?.['24p'] ?? {};
  return {
    player_id: ids.get(String(row.player_id)) ?? null,
    mkcentral_player_id: String(row.player_id),
    season_number: 3,
    display_name: row.lounge?.name ?? row.jugador,
    team_name: row.equipo,
    country: row.lounge?.country ?? null,
    tier: row.lounge?.tier ?? null,
    mkcentral_profile_url: row.mkcentral_profile ?? null,
    lounge_profile_id: row.lounge?.profile_id ? String(row.lounge.profile_id) : null,
    lounge_profile_url_12p: row.lounge?.profile_url_12p ?? null,
    lounge_profile_url_24p: row.lounge?.profile_url_24p ?? null,
    rank_12p: (s12.rank as number | null) ?? null,
    mmr_12p: (s12.mmr as number | null) ?? null,
    peak_mmr_12p: (s12.peak_mmr as number | null) ?? null,
    events_played_12p: (s12.events_played_total as number | null) ?? null,
    stats_12p: s12.stats ?? {},
    rank_24p: (s24.rank as number | null) ?? null,
    mmr_24p: (s24.mmr as number | null) ?? null,
    peak_mmr_24p: (s24.peak_mmr as number | null) ?? null,
    events_played_24p: (s24.events_played_total as number | null) ?? null,
    stats_24p: s24.stats ?? {},
    events: row.season_3?.events ?? [],
    source: row.collection?.source ?? 'lounge.mkcentral.com',
    collected_at: row.collection?.collected_at ?? null,
  };
});
for (let i = 0; i < rows.length; i += 200) {
  const { error } = await db.from('player_enriched_details').upsert(rows.slice(i, i + 200), {
    onConflict: 'mkcentral_player_id,season_number',
  });
  if (error) throw error;
  console.log(`Importados ${Math.min(i + 200, rows.length)} / ${rows.length}`);
}
console.log(`Listo. ${rows.length} perfiles procesados; ${rows.filter((r) => r.player_id).length} enlazados con players.`);
