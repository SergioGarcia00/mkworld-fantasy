import { countryCode as resolveCountryCode } from '@/lib/country-code';
import Link from 'next/link';
import { Flag } from 'lucide-react';
/* Enriched columns are maintained by a database migration ahead of generated client types. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from 'next/navigation';
import { publicCatalog, number, money } from '@/lib/public-data';
export const dynamic = 'force-dynamic';
export default async function Player({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await publicCatalog();
  const p = catalog.players.find((p) => p.slug === slug || p.id === slug);
  if (!p) notFound();
  const d: any = p.detail;
  const s12 = d?.stats_12p ?? {};
  const s24 = d?.stats_24p ?? {};
  const initials = p.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const chartEvents = (d?.events ?? []).slice(0, 24).reverse().filter((event: any) => event.mmr_after != null);
  const minMmr = Math.min(...chartEvents.map((event: any) => event.mmr_after), p.mmr ?? 0);
  const maxMmr = Math.max(...chartEvents.map((event: any) => event.mmr_after), p.mmr ?? 1);
  const points = chartEvents.map((event: any, index: number) => `${(index / Math.max(1, chartEvents.length - 1)) * 100},${100 - ((event.mmr_after - minMmr) / Math.max(1, maxMmr - minMmr)) * 82 - 9}`).join(' ');
  const percent = (value: number | null | undefined) => value == null ? '—' : `${(value / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 })}%`;
  const country = d?.country ?? 'País no registrado';
  const flagCode = resolveCountryCode(country);
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
        <p className="profile-meta">{flagCode ? <span className="country-flag" role="img" aria-label={`Bandera de ${country}`} style={{ backgroundImage: `url(https://flagcdn.com/w40/${flagCode}.png)` }} /> : <Flag size={15} aria-hidden="true" />} {country} · Lounge: {d?.display_name ?? p.name}</p>
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
          {points && <div className="mmr-chart"><div className="chart-labels"><span>{number(maxMmr)}</span><span>{number(minMmr)}</span></div><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Evolución reciente de MMR"><polyline points={points} fill="none" stroke="var(--blue)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg><span className="chart-caption">Evolución MMR · últimos {chartEvents.length} eventos</span></div>}
          <div className="profile-stat-grid"><div><strong>{number(s12.events_played ?? d?.events_played_12p ?? p.events)}</strong><span>Eventos 12p</span></div><div><strong>{percent(s12.win_rate_percent)}</strong><span>Win rate 12p</span></div><div><strong>{number(s24.mmr ?? d?.mmr_24p ?? null)}</strong><span>MMR 24p</span></div><div><strong>{percent(s24.win_rate_percent)}</strong><span>Win rate 24p</span></div></div>
          <p className="muted">Últimos eventos registrados: {d?.events?.length ?? p.events ?? 0}. Los valores no disponibles se conservan sin estimaciones.</p>
          <div className="toolbar"><a className="text-link" href={d?.mkcentral_profile_url ?? p.profile} target="_blank" rel="noreferrer">Perfil MKCentral ↗</a>{d?.lounge_profile_url_12p && <a className="text-link" href={d.lounge_profile_url_12p} target="_blank" rel="noreferrer">Perfil Lounge 12p ↗</a>}</div>
        </section>
        <section className="panel">
          <h2>Forma reciente</h2>
          <div className="recent-form"><div><strong>{number(s12.last_10_wins ?? null)}–{number(s12.last_10_losses ?? null)}</strong><span>Balance últimas 10</span></div><div><strong>{number(s12.last_10_mmr_delta ?? null)}</strong><span>Variación MMR</span></div><div><strong>{number(s12.average_score ?? null)}</strong><span>Media de puntos</span></div><div><strong>{number(s12.average_score_last_10 ?? null)}</strong><span>Media últimas 10</span></div><div><strong>{number(s12.largest_gain ?? null)}</strong><span>Mayor subida</span></div><div><strong>{number(s12.partner_average_score ?? null)}</strong><span>Media con pareja</span></div></div>
          <p className="muted">Datos de rendimiento de Season 3 en formato 12p. Los resultados fantasy se publican tras validar cada jornada.</p>
          <Link href="/leagues" className="text-link">Consultar clasificación</Link>
        </section>
      </div>
      <section className="panel player-history">
        <div className="section-heading"><div><h2>Historial reciente</h2><p className="muted">Últimos eventos registrados en Lounge · {d?.events?.length ?? 0} en total</p></div></div>
        {d?.events?.length ? <div className="event-list">{d.events.slice(0, 12).map((event: any, index: number) => <div className="event-row" key={`${event.event_id ?? 'event'}-${index}`}><div><strong>{event.name}</strong><span>{event.time_raw ?? 'Fecha no disponible'}</span></div><div className={event.mmr_delta > 0 ? 'delta positive' : event.mmr_delta < 0 ? 'delta negative' : 'delta'}>{event.mmr_delta > 0 ? '+' : ''}{number(event.mmr_delta)} <small>MMR</small></div><span className="event-after">{number(event.mmr_after)} después</span>{event.event_url && <a className="text-link" href={event.event_url} target="_blank" rel="noreferrer">Ver ↗</a>}</div>)}</div> : <p className="muted">Todavía no hay eventos registrados para este piloto.</p>}
      </section>
    </>
  );
}
