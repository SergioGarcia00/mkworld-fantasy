/* Dynamic Supabase relations are checked by PostgreSQL; the inherited client schema only covers core tables. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { participantData } from '@/components/participant-data';
import { ScoreForm } from '@/components/participant-forms';
export const metadata = { title: 'Puntuaciones' };
export default async function Scores() {
  const { db, team, roster } = await participantData();
  const { data: day, error } = await db
    .from('matchdays')
    .select('id,number,name,status')
    .in('status', ['OPEN', 'UPCOMING'])
    .order('number')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error('No se pudo cargar la jornada.');
  const { data: inputs } =
    team && day
      ? await db
          .from('player_weekly_inputs')
          .select('player_id,game_one,game_two')
          .eq('fantasy_team_id', team.id)
          .eq('matchday_id', day.id)
      : { data: [] };
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Puntuaciones</h1>
          <p className="muted">
            {day ? `Jornada ${day.number} · ${day.name}` : 'Sin jornada abierta'} · Dos carreras por
            piloto.
          </p>
        </div>
      </div>
      <section className="panel">
        <h2>{team?.name ?? 'Tu equipo'}</h2>
        <p className="muted">
          De 12 a 180 puntos por carrera. Puedes guardar la primera carrera y completar la segunda
          después. La administración valida los resultados.
        </p>
        {team && day && roster.length ? (
          roster.map((r: any) => {
            const input = inputs?.find((v: any) => v.player_id === r.player_id);
            return (
              <ScoreForm
                key={r.player_id}
                team={team.id}
                day={day.id}
                player={r.player_id}
                name={r.players?.name}
                one={input?.game_one}
                two={input?.game_two ?? undefined}
              />
            );
          })
        ) : (
          <div className="empty-state">
            <h3>Todavía no hay puntos que registrar</h3>
            <p>Los campos estarán disponibles cuando tengas plantilla y una jornada abierta.</p>
          </div>
        )}
      </section>
    </>
  );
}
