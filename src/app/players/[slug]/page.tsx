import Link from 'next/link';
/* Enriched columns are maintained by a database migration ahead of generated client types. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from 'next/navigation';
import { publicCatalog, number, money } from '@/lib/public-data';
export default async function Player({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await publicCatalog();
  const p = catalog.players.find((p) => p.slug === slug || p.id === slug);
  if (!p) notFound();
  const d: any = p.detail;
  const s12 = d?.stats_12p ?? {};
  const s24 = d?.stats_24p ?? {};
  const initials = p.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <>
      <Link className="back-link" href="/players">
        Volver a pilotos
      </Link>
      <section className="profile-banner">
        <div className="profile-identity">
          <div className="profile-avatar" aria-hidden="true">{initials}</div>
          <div><span className="badge">{d?.tier ?? 'Piloto Atlas'} · Season 3</span><h1>{p.name}</h1><Link className="text-link" href={`/teams/${encodeURIComponent(p.team)}`}>{p.team}</Link></div>
        </div>
        <p className="profile-meta">{d?.country ?? 'País no registrado'} · Lounge: {d?.display_name ?? p.name}</p>
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
          <h2>Rendimiento Lounge</h2>
          <div className="profile-stat-grid"><div><strong>{number(s12.events_played ?? d?.events_played_12p ?? p.events)}</strong><span>Eventos 12p</span></div><div><strong>{number(s12.win_rate_percent ?? null)}%</strong><span>Win rate 12p</span></div><div><strong>{number(s24.mmr ?? d?.mmr_24p ?? null)}</strong><span>MMR 24p</span></div><div><strong>{number(d?.events_played_24p ?? null)}</strong><span>Eventos 24p</span></div></div>
          <p className="muted">Últimos eventos registrados: {d?.events?.length ?? p.events ?? 0}. Los valores no disponibles se conservan sin estimaciones.</p>
          <div className="toolbar"><a className="text-link" href={d?.mkcentral_profile_url ?? p.profile} target="_blank" rel="noreferrer">Perfil MKCentral ↗</a>{d?.lounge_profile_url_12p && <a className="text-link" href={d.lounge_profile_url_12p} target="_blank" rel="noreferrer">Perfil Lounge 12p ↗</a>}</div>
        </section>
        <section className="panel">
          <h2>Forma reciente</h2>
          <div className="recent-form"><strong>{number(s12.last_10_wins ?? null)}–{number(s12.last_10_losses ?? null)}</strong><span>Balance últimas 10</span><strong>{number(s12.last_10_mmr_delta ?? null)}</strong><span>Variación MMR</span></div>
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
