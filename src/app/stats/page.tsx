import { PageHeading } from '@/components/ui';
import { publicCatalog, number } from '@/lib/public-data';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/env';
export const metadata = { title: 'Estadísticas' };
export default async function Stats() {
  const { players } = await publicCatalog();
  const db = isConfigured() ? await createClient() : null;
  const { data: weekly } = db
    ? await db.rpc('public_player_weekly_stats')
    : {
        data: [] as {
          player_id: string;
          total_points: number;
          users: number;
          matchdays: number;
          games: number;
          average_points: number;
        }[],
      };
  const rows = players
    .filter((p) => p.databaseId && weekly?.some((row) => row.player_id === p.databaseId))
    .map((player) => ({
      player,
      stats: weekly!.find((row) => row.player_id === player.databaseId)!,
    }))
    .sort((a, b) => Number(b.stats.total_points) - Number(a.stats.total_points));
  const average = rows.length
    ? rows.reduce((sum, row) => sum + Number(row.stats.average_points), 0) / rows.length
    : 0;
  return (
    <>
      <PageHeading
        title="La parrilla, en números"
        description="Solo jugadores con participación y puntos introducidos en jornadas."
      />
      <div className="metrics-strip">
        {[
          [number(rows.length), 'Jugadores con puntos'],
          [number(Math.round(average)), 'Media por partida'],
          [
            number((weekly ?? []).reduce((sum, row) => sum + Number(row.games), 0)),
            'Partidas puntuadas',
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
      <h2 className="section-heading">Rendimiento de jugadores participantes</h2>
      <div className="table-scroll">
        <table className="data-table pilot-table">
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Equipo</th>
              <th className="numeric">Usuarios</th>
              <th className="numeric">Jornadas</th>
              <th className="numeric">Partidas</th>
              <th className="numeric">Puntos totales</th>
              <th className="numeric">Media / partida</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ player, stats }, index) => (
              <tr key={player.id}>
                <td>
                  <strong>
                    {String(index + 1).padStart(2, '0')} · {player.name}
                  </strong>
                </td>
                <td>{player.team}</td>
                <td className="numeric">{number(Number(stats.users))}</td>
                <td className="numeric">{number(Number(stats.matchdays))}</td>
                <td className="numeric">{number(Number(stats.games))}</td>
                <td className="numeric mmr">{number(Number(stats.total_points))}</td>
                <td className="numeric">{number(Number(stats.average_points))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
