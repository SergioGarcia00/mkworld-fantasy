import Link from 'next/link';
import { Search, ArrowRight, ArrowLeft } from 'lucide-react';
import { publicCatalog } from '@/lib/public-data';
import { PageHeading, EmptyState } from '@/components/ui';
import { PlayerTable } from '@/components/player-table';
export const metadata = { title: 'Pilotos' };
export default async function Players({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; team?: string; mmr?: string; page?: string }>;
}) {
  const [catalog, params] = await Promise.all([publicCatalog(), searchParams]);
  const q = (params.q ?? '').trim().toLocaleLowerCase('es');
  const filtered = catalog.players.filter(
    (p) =>
      (!q || p.name.toLocaleLowerCase('es').includes(q)) &&
      (!params.team || p.team === params.team) &&
      (!params.mmr ||
        (params.mmr === 'top'
          ? (p.mmr ?? 0) > 9000
          : params.mmr === 'mid'
            ? p.mmr != null && p.mmr >= 4000 && p.mmr <= 5000
            : p.mmr != null && p.mmr < 4000)),
  );
  const total = Math.max(1, Math.ceil(filtered.length / 30));
  const page = Math.min(total, Math.max(1, Number(params.page) || 1));
  const url = (n: number) => {
    const s = new URLSearchParams({ ...params, page: String(n) });
    return `/players?${s}`;
  };
  return (
    <>
      <PageHeading
        title="Pilotos de Atlas"
        description="Conoce la parrilla. Encuentra tu próxima ventaja."
      >
        <span className="badge">{catalog.players.length.toLocaleString('es-ES')} pilotos</span>
      </PageHeading>
      <form className="toolbar">
        <label className="field">
          <span>Buscar piloto</span>
          <input name="q" defaultValue={params.q} placeholder="Nombre del piloto" />
        </label>
        <label className="field">
          <span>Equipo</span>
          <select name="team" defaultValue={params.team ?? ''}>
            <option value="">Todos los equipos</option>
            {catalog.teams.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>MMR</span>
          <select name="mmr" defaultValue={params.mmr ?? ''}>
            <option value="">Todos los rangos</option>
            <option value="top">Más de 9.000</option>
            <option value="mid">4.000 a 5.000</option>
            <option value="low">Menos de 4.000</option>
          </select>
        </label>
        <button className="button primary">
          <Search size={16} />
          Buscar
        </button>
        {(q || params.team || params.mmr) && (
          <Link href="/players" className="text-link">
            Quitar filtros
          </Link>
        )}
      </form>
      {catalog.offline && (
        <p className="notice">
          Mostrando el catálogo aportado de Atlas League. Los precios se publicarán cuando estén
          disponibles.
        </p>
      )}
      {filtered.length ? (
        <>
          <PlayerTable players={filtered.slice((page - 1) * 30, page * 30)} />
          <div className="pagination">
            {page > 1 ? (
              <Link className="button secondary" href={url(page - 1)}>
                <ArrowLeft size={16} />
                Anterior
              </Link>
            ) : (
              <span />
            )}
            <span>
              {filtered.length} resultados · Página {page} de {total}
            </span>
            {page < total ? (
              <Link className="button secondary" href={url(page + 1)}>
                Siguiente
                <ArrowRight size={16} />
              </Link>
            ) : (
              <span />
            )}
          </div>
        </>
      ) : (
        <EmptyState
          title="Ningún piloto coincide"
          description="Prueba otro nombre o elimina los filtros para ver toda la parrilla."
          href="/players"
          label="Ver todos los pilotos"
        />
      )}
    </>
  );
}
