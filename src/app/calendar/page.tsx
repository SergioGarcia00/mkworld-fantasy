import { PageHeading, Timeline, EmptyState } from '@/components/ui';
import { leagueFeed, statusLabel } from '@/lib/public-data';
import { CalendarDays } from 'lucide-react';
export const metadata = { title: 'Calendario' };
export default async function Calendar() {
  const feed = await leagueFeed();
  return (
    <>
      <PageHeading
        title="Cada semana, una nueva salida."
        description="Todos los cierres y las carreras de Atlas League. Horarios de Madrid."
      />
      <section className="panel">
        <h2>El ritmo de la competición</h2>
        <Timeline />
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
              <p>
                {d.start_at
                  ? new Intl.DateTimeFormat('es-ES', {
                      dateStyle: 'long',
                      timeZone: 'Europe/Madrid',
                    }).format(new Date(d.start_at))
                  : 'Fecha pendiente de publicación'}{' '}
                · Dos carreras
              </p>
            </div>
            <span className="badge">{statusLabel(d.status)}</span>
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
