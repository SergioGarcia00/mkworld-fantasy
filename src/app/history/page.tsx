import Link from 'next/link';
import { History } from 'lucide-react';
import { PageHeading, EmptyState } from '@/components/ui';
import { leagueFeed } from '@/lib/public-data';
export const metadata = { title: 'Historial' };
export default async function HistoryPage() {
  const feed = await leagueFeed();
  const days = feed.days.filter((d) => d.status === 'FINISHED').reverse();
  return (
    <>
      <PageHeading
        title="Las jornadas que nos trajeron aquí"
        description="El archivo público de resultados validados de Atlas League."
      />
      {days.length ? (
        days.map((d) => (
          <Link className="calendar-event" key={d.id} href={`/leagues?matchday=${d.id}`}>
            <strong>{String(d.number).padStart(2, '0')}</strong>
            <div>
              <h2>{d.name}</h2>
              <p>Consultar clasificación de esta jornada</p>
            </div>
          </Link>
        ))
      ) : (
        <EmptyState
          title={
            feed.daysUnavailable
              ? 'Historial no disponible'
              : 'La historia empieza en la primera carrera'
          }
          description={
            feed.daysUnavailable
              ? 'No se han podido cargar las jornadas. Vuelve a intentarlo.'
              : 'Aquí se archivarán las jornadas después de validar sus resultados.'
          }
          icon={History}
          href="/calendar"
          label="Ver próximas jornadas"
        />
      )}
    </>
  );
}
