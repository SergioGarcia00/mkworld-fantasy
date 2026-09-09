import Link from 'next/link';
/* Enriched profile fields are maintained by the database migration. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Search, ArrowRight, ArrowLeft } from 'lucide-react';
import { publicCatalog } from '@/lib/public-data';
import { PageHeading, EmptyState } from '@/components/ui';
import { PlayerTable } from '@/components/player-table';
export const metadata = { title: 'Pilotos' };
export default async function Players({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    team?: string;
    mmr?: string;
    country?: string;
    tier?: string;
    format?: string;
    page?: string;
  }>;
}) {
  const [catalog, params] = await Promise.all([publicCatalog(), searchParams]);
  const q = (params.q ?? '').trim().toLocaleLowerCase('es');
  const format = params.format === '24' ? '24' : '12';
  const countries = [
    ...new Set(catalog.players.map((p) => (p.detail as any)?.country).filter(Boolean)),
  ].sort();
  const tiers = [
    ...new Set(catalog.players.map((p) => (p.detail as any)?.tier).filter(Boolean)),
  ].sort();
  const filtered = catalog.players.filter(
    (p) =>
      p.name.trim().toLocaleLowerCase('es') !== 'breve' &&
      (!q || p.name.toLocaleLowerCase('es').includes(q)) &&
      (!params.team || p.team === params.team) &&
      (!params.country || (p.detail as any)?.country === params.country) &&
      (!params.tier || (p.detail as any)?.tier === params.tier) &&
      (!params.mmr ||
        (params.mmr === 'top'
          ? ((format === '24' ? (p.detail as any)?.mmr_24p : p.mmr) ?? 0) > 9000
          : params.mmr === 'mid'
            ? ((format === '24' ? (p.detail as any)?.mmr_24p : p.mmr) ?? 0) >= 4000 &&
              ((format === '24' ? (p.detail as any)?.mmr_24p : p.mmr) ?? 0) <= 5000
            : ((format === '24' ? (p.detail as any)?.mmr_24p : p.mmr) ?? 0) < 4000)),
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
          <span>Formato</span>
          <select name="format" defaultValue={format}>
            <option value="12">12p</option>
            <option value="24">24p</option>
          </select>
        </label>
        <label className="field">
          <span>Buscar piloto</span>
          <input name="q" defaultValue={params.q} placeholder="Nombre del piloto" />
        </label>
        <label className="field">
          <span>País</span>
          <select name="country" defaultValue={params.country ?? ''}>
            <option value="">Todos</option>
            {countries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Tier</span>
          <select name="tier" defaultValue={params.tier ?? ''}>
            <option value="">Todos</option>
            {tiers.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
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
        {(q || params.team || params.mmr || params.country || params.tier || params.format) && (
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
          <p className="muted player-seeding-note">
            Las divisiones y conferencias corresponden a las seedings preliminares de Season 3.
          </p>
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
