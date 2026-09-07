import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publicCatalog, number, money } from '@/lib/public-data';
export default async function Player({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await publicCatalog();
  const p = catalog.players.find((p) => p.slug === slug || p.id === slug);
  if (!p) notFound();
  return (
    <>
      <Link className="back-link" href="/players">
        Volver a pilotos
      </Link>
      <section className="profile-banner">
        <span className="badge">Piloto Atlas · Season 3</span>
        <h1>{p.name}</h1>
        <Link className="text-link" href={`/teams/${encodeURIComponent(p.team)}`}>
          {p.team}
        </Link>
      </section>
      <section className="metrics-strip" aria-label="Datos del piloto">
        {[
          [number(p.mmr), 'MMR actual'],
          [p.rank ? `#${number(p.rank)}` : '—', 'Posición Lounge'],
          [number(p.peak), 'MMR máximo'],
          [money(p.price), 'Valor de mercado'],
        ].map(([v, l]) => (
          <div key={l}>
            <strong>{v}</strong>
            <span>{l}</span>
          </div>
        ))}
      </section>
      <div className="grid-2">
        <section className="panel">
          <h2>Trayectoria en Lounge</h2>
          <p className="muted">
            {p.events ?? 'Sin datos de'} eventos registrados en Season 3, formato 12 jugadores. Los
            valores no disponibles se conservan sin estimaciones.
          </p>
          <a className="text-link" href={p.profile} target="_blank" rel="noreferrer">
            Ver perfil en MKCentral
          </a>
        </section>
        <section className="panel">
          <h2>Puntos fantasy</h2>
          <p className="muted">
            Los resultados fantasy aparecerán después de la validación oficial de cada jornada.
          </p>
          <Link href="/leagues" className="text-link">
            Consultar clasificación
          </Link>
        </section>
      </div>
    </>
  );
}
