/* Dynamic Supabase relations are checked by PostgreSQL; the inherited client schema only covers core tables. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { participantData, euros, squadValue } from '@/components/participant-data';
import { Countdown, LineupForm, Submit } from '@/components/participant-forms';
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
  const currentSquadValue = squadValue(roster);
  const open = madridWeek().marketOpen;
  const { data: day } = await db
    .from('matchdays')
    .select('id,number,name,status,lock_at,start_at')
    .in('status', ['OPEN', 'UPCOMING', 'LOCKED'])
    .order('number')
    .limit(1)
    .maybeSingle();
  const { data: saved } =
    team && day
      ? await db
          .from('fantasy_lineups')
          .select('fantasy_lineup_players(player_id,is_captain)')
          .eq('fantasy_team_id', team.id)
          .eq('matchday_id', day.id)
          .maybeSingle()
      : { data: null };
  const { data: transactions } = team
    ? await db
        .from('fantasy_transactions')
        .select('id,type,amount,description,created_at')
        .eq('fantasy_team_id', team.id)
        .order('created_at', { ascending: false })
        .limit(12)
    : { data: [] };
  const lineupPlayers = saved?.fantasy_lineup_players ?? selected;
  const deadline = day
    ? new Date(
        Math.min(
          Date.parse(day.lock_at),
          Date.parse(madridWeek(new Date(day.start_at)).lineupClose),
        ),
      ).toISOString()
    : null;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{team?.name ?? 'Mi equipo'}</h1>
          <p className="muted">
            Tu plantilla de Atlas League · {roster.length} de 10 plazas ocupadas
          </p>
        </div>
        <a href="#lineup" className="button primary">
          Preparar alineación
        </a>
      </div>
      {(params.error || params.success) && <p role="status">{params.error || params.success}</p>}
      <div className="participant-summary">
        <div>
          <span className="muted">Saldo disponible</span>
          <strong>{team ? euros(team.budget) : '—'}</strong>
        </div>
        <div>
          <span className="muted">Valor de plantilla</span>
          <strong>{euros(currentSquadValue)}</strong>
        </div>
        <div>
          <span className="muted">Patrimonio</span>
          <strong>{team ? euros(Number(team.budget) + currentSquadValue) : '—'}</strong>
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
            {lineupPlayers.length} titulares · {Math.max(0, roster.length - lineupPlayers.length)}{' '}
            reservas
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
      <section className="panel economy-history">
        <div className="toolbar">
          <h2>Movimientos</h2>
          <span className="muted">Últimas operaciones</span>
        </div>
        {transactions?.length ? (
          <div className="transaction-list">
            {transactions.map((tx: any) => {
              const positive = [
                'ROUND_POINTS_REWARD',
                'ROUND_POSITION_BONUS',
                'ROUND_PARTICIPATION_BONUS',
                'PILOT_MARKET_SALE',
                'SELL',
              ].includes(tx.type);
              return (
                <div className="transaction-row" key={tx.id}>
                  <div>
                    <strong>{tx.description ?? tx.type}</strong>
                    <span className="muted">
                      {new Date(tx.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <strong className={positive ? 'transaction-positive' : 'transaction-negative'}>
                    {positive ? '+' : '-'}
                    {euros(tx.amount)}
                  </strong>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted">Aún no tienes movimientos económicos.</p>
        )}
      </section>
      <section className="panel" id="lineup">
        <div className="toolbar">
          <div>
            <h2>{day ? `Jornada ${day.number} · ${day.name}` : 'Próxima jornada pendiente'}</h2>
            <p className="muted">Seis titulares, cuatro reservas y un capitán.</p>
          </div>
          {deadline && <Countdown at={deadline} />}
        </div>
        {team && day && roster.length ? (
          <LineupForm
            team={team.id}
            day={day.id}
            roster={roster}
            selected={(saved?.fantasy_lineup_players ?? []).map((p: any) => p.player_id)}
            captain={
              (saved?.fantasy_lineup_players ?? []).find((p: any) => p.is_captain)?.player_id ?? ''
            }
            deadline={day.status === 'LOCKED' ? new Date(0).toISOString() : deadline!}
          />
        ) : (
          <p className="muted">
            Necesitas una jornada publicada y jugadores en tu plantilla para alinear.
          </p>
        )}
      </section>
    </>
  );
}
