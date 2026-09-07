/* Dynamic Supabase relations are checked by PostgreSQL; the inherited client schema only covers core tables. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { participantData, euros } from '@/components/participant-data';
import { Submit } from '@/components/participant-forms';
import { madridWeek } from '@/components/participant-time';
import { sellPlayer } from '@/app/market/actions';
export const metadata = { title: 'Mi equipo' };
export default async function MyTeam({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { db, team, roster } = await participantData();
  const params = await searchParams;
  const { data: lineup } = team
    ? await db
        .from('fantasy_lineups')
        .select('fantasy_lineup_players(player_id,is_captain)')
        .eq('fantasy_team_id', team.id)
        .order('saved_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const selected = lineup?.fantasy_lineup_players ?? [];
  const rated = roster.filter((r: any) => r.players?.mmr != null);
  const open = madridWeek().marketOpen;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{team?.name ?? 'Mi equipo'}</h1>
          <p className="muted">
            Tu plantilla de Atlas League · {roster.length} de 10 plazas ocupadas
          </p>
        </div>
        <Link href="/lineup" className="button primary">
          Preparar alineación
        </Link>
      </div>
      {(params.error || params.success) && <p role="status">{params.error || params.success}</p>}
      <div className="participant-summary">
        <div>
          <span className="muted">Presupuesto</span>
          <strong>{team ? euros(team.budget) : '—'}</strong>
        </div>
        <div>
          <span className="muted">Valor de plantilla</span>
          <strong>
            {euros(
              roster.reduce((sum: number, r: any) => sum + Number(r.players?.market_value ?? 0), 0),
            )}
          </strong>
        </div>
        <div>
          <span className="muted">MMR medio</span>
          <strong>
            {rated.length
              ? Math.round(
                  rated.reduce((sum: number, r: any) => sum + r.players.mmr, 0) / rated.length,
                ).toLocaleString('es-ES')
              : '—'}
          </strong>
        </div>
        <div>
          <span className="muted">Última alineación</span>
          <strong>
            {selected.length} titulares · {Math.max(0, roster.length - selected.length)} reservas
          </strong>
        </div>
      </div>
      <section className="panel">
        <h2>Tu parrilla</h2>
        {roster.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Piloto</th>
                  <th>Equipo Atlas</th>
                  <th>Rol</th>
                  <th>MMR</th>
                  <th>Valor</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r: any) => {
                  const position = selected.find((s: any) => s.player_id === r.player_id);
                  return (
                    <tr key={r.player_id}>
                      <td>
                        <Link href={`/players/${r.players?.slug}`}>{r.players?.name}</Link>
                      </td>
                      <td>{r.players?.teams?.name}</td>
                      <td>
                        {position?.is_captain ? 'Capitán × 1,5' : position ? 'Titular' : 'Reserva'}
                      </td>
                      <td>{r.players?.mmr ?? '—'}</td>
                      <td>{euros(r.players?.market_value ?? 0)}</td>
                      <td>
                        <form action={sellPlayer}>
                          <input type="hidden" name="team" value={team.id} />
                          <input type="hidden" name="player" value={r.player_id} />
                          <Submit disabled={!open}>Vender · {euros(r.purchase_price)}</Submit>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <h3>{team ? 'Tu plantilla empieza aquí' : 'Tu equipo todavía no está asignado'}</h3>
            <p>
              {team
                ? 'Explora las ofertas para completar tus diez plazas.'
                : 'Contacta con administración para que te asigne un equipo.'}
            </p>
            <Link href="/market" className="button primary">
              Ir al mercado
            </Link>
          </div>
        )}
        {!open && (
          <p className="muted">Las ventas están cerradas hasta la próxima apertura del mercado.</p>
        )}
      </section>
    </>
  );
}
