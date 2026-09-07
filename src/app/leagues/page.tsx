import { Trophy } from 'lucide-react';
import { PageHeading, EmptyState } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/env';
import { number } from '@/lib/public-data';
export const metadata = { title: 'Clasificación oficial' };
export default async function Standings({
  searchParams,
}: {
  searchParams: Promise<{ matchday?: string }>;
}) {
  const { matchday } = await searchParams;
  if (!isConfigured())
    return (
      <>
        <PageHeading title="Clasificación oficial" />
        <Empty />
      </>
    );
  const db = await createClient();
  const [rows, days] = await Promise.all([
    db.rpc('spectator_standings', { target_matchday: matchday || null }),
    db.rpc('spectator_matchdays', {}),
  ]);
  if (rows.error || days.error)
    return (
      <>
        <PageHeading title="Clasificación oficial" />
        <EmptyState
          title="La clasificación no está disponible"
          description="No se han podido consultar los resultados. Vuelve a intentarlo en unos instantes."
          icon={Trophy}
        />
      </>
    );
  return (
    <>
      <PageHeading
        title="La clasificación se gana en pista."
        description="Resultados oficiales de Atlas League. Solo cuentan las jornadas validadas."
      />
      {!days.data.length ? (
        <Empty />
      ) : (
        <>
          <form className="toolbar">
            <label className="field">
              <span>Jornada</span>
              <select name="matchday" defaultValue={matchday ?? ''}>
                <option value="">Clasificación general</option>
                {days.data.map((d) => (
                  <option value={d.id} key={d.id}>
                    Jornada {d.number} · {d.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="button secondary">Consultar</button>
          </form>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Posición</th>
                  <th>Equipo</th>
                  <th>Participante</th>
                  <th className="numeric">Puntos</th>
                  <th className="numeric">Diferencia al líder</th>
                  <th className="numeric">Jornadas validadas</th>
                  <th>Tendencia</th>
                </tr>
              </thead>
              <tbody>
                {rows.data.map((r) => (
                  <tr key={r.fantasy_team_id}>
                    <td className="mmr">#{r.position}</td>
                    <td>
                      <strong>{r.fantasy_team_name}</strong>
                    </td>
                    <td className="muted">{r.participant_name}</td>
                    <td className="numeric mmr">{number(Number(r.total_points))}</td>
                    <td className="numeric">
                      {Number(r.total_points) === Number(rows.data[0]?.total_points)
                        ? '—'
                        : number(Number(rows.data[0]?.total_points) - Number(r.total_points))}
                    </td>
                    <td className="numeric">{matchday ? 1 : days.data.length}</td>
                    <td className="muted">Sin comparativa</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.data.length && <Empty />}
        </>
      )}
    </>
  );
}
function Empty() {
  return (
    <EmptyState
      title="Todo está por decidir."
      description="La clasificación aparecerá tras validar la primera jornada."
      href="/calendar"
      label="Consultar calendario"
      icon={Trophy}
    />
  );
}
