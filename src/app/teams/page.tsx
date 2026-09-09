import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { publicCatalog } from '@/lib/public-data';
import { PageHeading, EmptyState } from '@/components/ui';
import { seedingFor } from '@/lib/season-seedings';
export const metadata = { title: 'Equipos Atlas' };
export default async function Teams({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [catalog, { q = '' }] = await Promise.all([publicCatalog(), searchParams]);
  const teams = catalog.teams.filter((t) => t.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeading
        title="Los equipos de Atlas"
        description="Una parrilla con identidad propia. Descubre quién compite por cada escudería."
      />
      <form className="toolbar">
        <label className="field">
          <span>Buscar equipo</span>
          <input name="q" defaultValue={q} placeholder="Nombre del equipo" />
        </label>
        <button className="button primary">Buscar equipo</button>
        {q && (
          <Link className="text-link" href="/teams">
            Quitar filtro
          </Link>
        )}
      </form>
      <div className="team-list">
        {teams.map((team) => (
          <Link className="team-row" key={team} href={`/teams/${encodeURIComponent(team)}`}>
            <span className="team-monogram" aria-hidden="true">
              {team.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h2>{team}</h2>
              <p>
                {catalog.players.filter((p) => p.team === team).length} pilotos{' '}
                {seedingFor(team) &&
                  `· División ${seedingFor(team)!.division} · Conferencia ${seedingFor(team)!.conference}`}
              </p>
            </div>
            <ArrowUpRight size={18} />
          </Link>
        ))}
      </div>
      {!teams.length && (
        <EmptyState
          title="No encontramos ese equipo"
          description="Prueba otra búsqueda para encontrar una escudería de Atlas."
          href="/teams"
          label="Ver equipos"
        />
      )}
    </>
  );
}
