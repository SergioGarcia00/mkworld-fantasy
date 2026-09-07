import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publicCatalog, number } from '@/lib/public-data';
import { PlayerTable } from '@/components/player-table';
export default async function Team({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await publicCatalog();
  const team = catalog.teams.find((t) => t === decodeURIComponent(slug));
  if (!team) notFound();
  const players = catalog.players.filter((p) => p.team === team);
  const known = players.filter((p) => p.mmr != null);
  return (
    <>
      <Link href="/teams" className="back-link">
        Volver a equipos
      </Link>
      <section className="profile-banner">
        <span className="badge">Equipo Atlas</span>
        <h1>{team}</h1>
        <p>
          {players.length} pilotos · MMR medio{' '}
          {known.length
            ? number(Math.round(known.reduce((s, p) => s + (p.mmr ?? 0), 0) / known.length))
            : '—'}{' '}
          entre pilotos con datos
        </p>
      </section>
      <h2 className="section-heading">La plantilla</h2>
      <PlayerTable players={players} />
    </>
  );
}
