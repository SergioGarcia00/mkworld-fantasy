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
  const selectedMatchday =
    matchday &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(matchday)
      ? matchday
      : null;
  if (!isConfigured())
    return (
      <>
        <PageHeading title="Clasificación oficial" />
        <Empty />
      </>
    );
  const db = await createClient();
  const [rows, days, pilotScores, pilotCatalog] = await Promise.all([
    db.rpc('spectator_standings', { target_matchday: selectedMatchday }),
    db.rpc('spectator_matchdays', {}),
    (db as any).rpc('public_player_weekly_stats'),
    (db as any).from('players').select('id,name,teams(name)').eq('status', 'ACTIVE'),
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
          <form className="toolbar standings-toolbar" method="get" action="/leagues">
            <label className="field">
              <span>Jornada</span>
              <select name="matchday" defaultValue={selectedMatchday ?? ''}>
                <option value="">Clasificación general</option>
                {days.data.map((d) => (
                  <option value={d.id} key={d.id}>
                    Jornada {d.number} · {d.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="button secondary" type="submit">
              Consultar
            </button>
            <span className="standings-rounds">
              {selectedMatchday ? '1' : days.data.length} jornadas validadas
            </span>
          </form>
          {rows.data.length > 0 && <Podium rows={rows.data.slice(0, 3)} />}
          <h2 className="standings-section-title">Clasificación completa</h2>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Posición</th>
                  <th>Equipo / participante</th>
                  <th className="numeric">Puntos</th>
                  <th className="numeric">Diferencia al líder</th>
                  <th>Media / jornada</th>
                </tr>
              </thead>
              <tbody>
                {rows.data.slice(3).map((r) => (
                  <tr key={r.fantasy_team_id}>
                    <td className="mmr">#{r.position}</td>
                    <td>
                      <strong>{r.fantasy_team_name}</strong>
                      <span className="standing-participant">{r.participant_name}</span>
                    </td>
                    <td className="numeric mmr">{number(Number(r.total_points))}</td>
                    <td className="numeric">
                      {Number(r.total_points) === Number(rows.data[0]?.total_points)
                        ? '—'
                        : number(Number(rows.data[0]?.total_points) - Number(r.total_points))}
                    </td>
                    <td className="standing-trend">
                      {number(
                        Number(r.total_points) /
                          Math.max(1, selectedMatchday ? 1 : days.data.length),
                      )}{' '}
                      pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PilotHighlights
            scores={(pilotScores.data ?? []).map((s: any) => ({
              ...s,
              players: (pilotCatalog.data ?? []).find((p: any) => p.id === s.player_id),
            }))}
            matchday={selectedMatchday}
          />
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

function Podium({ rows }: { rows: any[] }) {
  const ordered = [rows[1], rows[0], rows[2]].filter(Boolean);
  return (
    <section className="podium" aria-label="Podio general">
      {ordered.map((r) => (
        <article className={`podium-card podium-${r.position}`} key={r.fantasy_team_id}>
          <span className="podium-medal">
            {r.position === 1 ? '1.º' : r.position === 2 ? '2.º' : '3.º'}
          </span>
          <strong>{r.fantasy_team_name}</strong>
          <span className="muted">{r.participant_name}</span>
          <b>{number(Number(r.total_points))} pts</b>
          <small>
            {r.position === 1
              ? 'Líder'
              : `−${number(Number(rows[0].total_points) - Number(r.total_points))} pts`}
          </small>
        </article>
      ))}
    </section>
  );
}

function PilotHighlights({ scores, matchday }: { scores: any[]; matchday: string | null }) {
  const totals = new Map<string, any>();
  scores.forEach((row) => {
    const current = totals.get(row.player_id) ?? { ...row, total: 0, rounds: 0 };
    current.total += Number(row.total_points ?? row.points) || 0;
    current.rounds += Number(row.matchdays ?? 1);
    totals.set(row.player_id, current);
  });
  const top = [...totals.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  return (
    <section className="pilot-highlights">
      <div className="section-heading">
        <div>
          <h2>Pilotos destacados</h2>
          <p className="muted">
            Puntos Fantasy acumulados en jornadas validadas
            {matchday ? ' · jornada seleccionada' : ''}.
          </p>
        </div>
      </div>
      {top.length ? (
        <div className="pilot-highlight-list">
          {top.map((p, i) => (
            <div className="pilot-highlight-row" key={p.player_id}>
              <span className="mmr">#{i + 1}</span>
              <div>
                <strong>{p.players?.name ?? 'Piloto'}</strong>
                <span>{p.players?.teams?.name ?? 'Equipo no disponible'}</span>
              </div>
              <b>{number(p.total)} pts</b>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Todavía no hay puntos individuales publicados.</p>
      )}
    </section>
  );
}
