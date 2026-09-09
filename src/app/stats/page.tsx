import { PageHeading } from '@/components/ui';
import { PlayerTable } from '@/components/player-table';
import { publicCatalog, number } from '@/lib/public-data';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/env';
export const metadata = { title: 'Estadísticas' };
export default async function Stats() {
  const { players } = await publicCatalog();
  const db = isConfigured() ? await createClient() : null;
  const { data: weekly } = db
    ? await db.rpc('public_player_weekly_stats')
    : { data: [] as { player_id: string; total_points: number; entries: number }[] };
  const activeIds = new Set((weekly ?? []).map((row) => row.player_id));
  const known = players
    .filter((p) => p.databaseId && activeIds.has(p.databaseId))
    .sort((a, b) => (b.mmr ?? 0) - (a.mmr ?? 0));
  return (
    <>
      <PageHeading
        title="La parrilla, en números"
        description="Solo jugadores con participación y puntos introducidos en jornadas."
      />
      <div className="metrics-strip">
        {[
          [number(known.length), 'Jugadores con puntos'],
          [
            number(
              Math.round(known.reduce((s, p) => s + (p.mmr ?? 0), 0) / Math.max(known.length, 1)),
            ),
            'MMR medio',
          ],
          [
            number((weekly ?? []).reduce((sum, row) => sum + Number(row.entries), 0)),
            'Puntuaciones registradas',
          ],
          [
            number((weekly ?? []).reduce((sum, row) => sum + Number(row.total_points), 0)),
            'Puntos acumulados',
          ],
        ].map(([v, l]) => (
          <div key={l}>
            <strong>{v}</strong>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <h2 className="section-heading">Jugadores con puntuaciones registradas</h2>
      <PlayerTable players={known.slice(0, 20)} />
    </>
  );
}
