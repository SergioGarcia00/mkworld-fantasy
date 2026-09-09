/* Dynamic Supabase relations are checked by PostgreSQL; the inherited client schema only covers core tables. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { participantData } from '@/components/participant-data';
import { Countdown, LineupForm } from '@/components/participant-forms';
import { madridWeek } from '@/components/participant-time';
export const metadata = { title: 'Tu alineación' };
export default async function Lineup() {
  const { db, team, roster } = await participantData();
  const { data: day, error } = await db
    .from('matchdays')
    .select('id,number,name,status,lock_at,start_at')
    .in('status', ['OPEN', 'UPCOMING', 'LOCKED'])
    .order('number')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error('No se pudo cargar la jornada.');
  const { data: saved } =
    team && day
      ? await db
          .from('fantasy_lineups')
          .select('fantasy_lineup_players(player_id,is_captain)')
          .eq('fantasy_team_id', team.id)
          .eq('matchday_id', day.id)
          .maybeSingle()
      : { data: null };
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
          <h1>Tu alineación</h1>
          <p className="muted">
            Seis titulares. Cuatro reservas. Un capitán que marca la diferencia.
          </p>
        </div>
        {deadline && <Countdown at={deadline} />}
      </div>
      <section className="panel">
        <div className="toolbar">
          <h2>{day ? `Jornada ${day.number} · ${day.name}` : 'Próxima jornada pendiente'}</h2>
          <span className="badge">{saved ? 'Alineación guardada' : 'Pendiente'}</span>
        </div>
        <p className="muted">
          Cierre el sábado a las 23:59, hora de Madrid.
          {deadline &&
            ` Límite de esta jornada: ${new Date(deadline).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}.`}
        </p>
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
            matchdayTitle={`Jornada ${day.number} · ${day.name}`}
          />
        ) : (
          <div className="empty-state">
            <h3>Prepara tu parrilla</h3>
            <p>Necesitas una jornada publicada y jugadores en tu plantilla para alinear.</p>
            <Link className="button primary" href="/market">
              Explorar el mercado
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
