import { PageHeading, Timeline, EmptyState } from '@/components/ui';
import { leagueFeed, statusLabel } from '@/lib/public-data';
import { CalendarDays } from 'lucide-react';
import { practiceSettings } from '@/lib/practice';
export const metadata = { title: 'Calendario' };
export default async function Calendar() {
  const feed = await leagueFeed();
  const practice = await practiceSettings();
  return (
    <>
      <PageHeading
        title="Cada semana, una nueva salida."
        description={
          practice?.test_mode
            ? 'Modo de pruebas: los horarios están suspendidos y la administración controla los pasos.'
            : 'Todos los cierres y las carreras de Atlas League. Horarios de Madrid.'
        }
      />
      <section className="panel">
        <h2>El ritmo de la competición</h2>
        {practice?.test_mode ? <p>Sin plazos automáticos durante las pruebas.</p> : <Timeline />}
      </section>
      {feed.daysUnavailable ? (
        <EmptyState
          title="No se ha podido cargar el calendario"
          description="Vuelve a abrir esta página para consultar las jornadas publicadas."
          icon={CalendarDays}
        />
      ) : feed.days.length ? (
        feed.days.map((d) => (
          <article className="calendar-event" key={d.id}>
            <strong>{String(d.number).padStart(2, '0')}</strong>
            <div>
              <h2>{d.name}</h2>
              {practice?.test_mode && d.id === practice.test_matchday_id ? (
                <p>Jornada de pruebas · sin horario automático</p>
              ) : d.start_at ? (
                <div className="calendar-event-details">
                  <p>
                    {new Intl.DateTimeFormat('es-ES', {
                      dateStyle: 'long',
                      timeZone: 'Europe/Madrid',
                    }).format(new Date(d.start_at))}
                  </p>
                  <span>
                    {new Intl.DateTimeFormat('es-ES', {
                      timeStyle: 'short',
                      timeZone: 'Europe/Madrid',
                    }).format(new Date(d.start_at))}{' '}
                    · 2 partidas
                  </span>
                </div>
              ) : (
                <p>Fecha pendiente de publicación · 2 partidas</p>
              )}
            </div>
            <div className="calendar-event-status">
              <span className="badge">{statusLabel(d.status)}</span>
              <span className="calendar-event-count">2 partidas</span>
            </div>
          </article>
        ))
      ) : (
        <EmptyState
          title="Calendario en preparación"
          description="Las jornadas aparecerán cuando la administración las publique. Mientras tanto, puedes conocer a los pilotos."
          icon={CalendarDays}
          href="/players"
          label="Explorar jugadores"
        />
      )}
    </>
  );
}
