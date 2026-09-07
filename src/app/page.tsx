import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Trophy,
  Newspaper,
  MessageSquare,
  Flag,
  CalendarDays,
} from 'lucide-react';
import { leagueFeed, publicCatalog, statusLabel } from '@/lib/public-data';
import { WEEKLY_SCHEDULE, EmptyState } from '@/components/ui';
import { PlayerTable } from '@/components/player-table';
import { Popup } from '@/components/popup';
import { StandingsPreview } from '@/components/standings-preview';
import hero from './overview-hero.module.css';
export default async function Home() {
  const [catalog, feed] = await Promise.all([publicCatalog(), leagueFeed()]);
  const featured = ['Byakuya Togami', 'Celestia Ludenberg', 'Chiaki Nanami', 'Dragnir'];
  const players = featured.flatMap((n) => {
    const p = catalog.players.find((p) => p.name.startsWith(n));
    return p ? [p] : [];
  });
  const day = feed.days.find((d) => ['OPEN', 'UPCOMING'].includes(d.status));
  return (
    <div className="overview">
      <div className="overview-title">
        <h1>Vista general</h1>
        <span className="badge">
          <span className="status-dot" />
          {day ? statusLabel(day.status) : 'Preparando la próxima salida'}
        </span>
      </div>
      <section className={hero.hero} aria-labelledby="matchday-heading">
        <div className={hero.intro}>
          <h2 id="matchday-heading">La próxima jornada empieza aquí.</h2>
          <p>Dos carreras. Una plantilla. Toda la pista.</p>
          <Link href="/players" className={`button primary ${hero.explore}`}>
            Explorar jugadores
            <ArrowUpRight size={19} />
          </Link>
          <div className={hero.signature}>
            <Flag size={24} strokeWidth={1.5} aria-hidden="true" />
            <span className={hero.wordmark}>ATLAS LEAGUE</span>
            <span className={hero.season}>Mario Kart World · Temporada 03</span>
          </div>
        </div>
        <div className={hero.agenda}>
          <div className={hero.agendaHeader}>
            <div>
              <h3>Tu semana en pista</h3>
              <p>Todos los horarios, hora de Madrid</p>
            </div>
            <Link className={hero.calendarLink} href="/calendar" aria-label="Ver calendario completo">
              <CalendarDays size={21} aria-hidden="true" />
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <ol className={hero.schedule}>
            {WEEKLY_SCHEDULE.map(([weekday, time, label]) => (
              <li key={weekday} className={weekday === 'DOM' ? hero.race : undefined}>
                <span className={hero.weekday}>{weekday}</span>
                <span className={hero.time}>{time}</span>
                <span className={hero.event}>{label}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="metrics-strip" aria-label="La liga en cifras">
        {[
          ['1.965', 'Pilotos en la parrilla'],
          ['121', 'Equipos Atlas'],
          ['6 + 4', 'Titulares y reservas'],
          ['100 M€', 'Presupuesto inicial'],
        ].map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>
      <div className="overview-columns">
        <section className="directory-section">
          <div className="section-heading">
            <h2>Pilotos de Atlas</h2>
            <Link className="text-link" href="/players">
              Ver pilotos
              <ArrowRight size={16} />
            </Link>
          </div>
          <PlayerTable players={players} />
          <p className="table-note">
            MMR de Season 3 · Los valores sin datos se muestran con un guion.
          </p>
          <div className="league-status">
            <CalendarDays size={24} />
            <div>
              <h3>
                {day ? `Jornada ${day.number} · ${day.name}` : 'La parrilla se está preparando'}
              </h3>
              <p>
                {day
                  ? statusLabel(day.status)
                  : 'El calendario aparecerá cuando se publique la próxima jornada.'}
              </p>
            </div>
            <Link href="/calendar" aria-label="Consultar calendario">
              <ArrowUpRight />
            </Link>
          </div>
        </section>
        <aside className="overview-aside">
          <section>
            <div className="section-heading">
              <h2>Clasificación general</h2>
              <Trophy size={18} />
            </div>
            <StandingsPreview />
          </section>
          <section className="news-preview">
            <div className="section-heading">
              <h2>Noticias</h2>
              <Newspaper size={18} />
            </div>
            <h3>{feed.news[0]?.title ?? 'La actualidad, a pie de pista.'}</h3>
            <p>
              {feed.newsUnavailable
                ? 'No se han podido consultar las noticias. Vuelve a intentarlo.'
                : (feed.news[0]?.body.slice(0, 120) ??
                  'Todavía no hay noticias publicadas. Aquí encontrarás los anuncios oficiales de la liga.')}
            </p>
            <Popup title="Noticias de Atlas League" label="Abrir noticias">
              {feed.news.length ? (
                feed.news.map((n) => (
                  <article className="news-article" key={n.id}>
                    <span className="badge">{n.category}</span>
                    <h3>{n.title}</h3>
                    <p>{n.body}</p>
                  </article>
                ))
              ) : (
                <EmptyState
                  title={
                    feed.newsUnavailable ? 'Noticias no disponibles' : 'Sin noticias por ahora'
                  }
                  description={
                    feed.newsUnavailable
                      ? 'No se han podido cargar las noticias. Inténtalo de nuevo más tarde.'
                      : 'Los anuncios oficiales aparecerán aquí cuando se publiquen.'
                  }
                  icon={Newspaper}
                />
              )}
            </Popup>
          </section>
        </aside>
      </div>
      <section className="chat-banner">
        <MessageSquare size={28} />
        <div>
          <h2>La conversación sigue en el paddock.</h2>
          <p>Comparte la jornada con la comunidad de Atlas League.</p>
        </div>
        <Popup title="Chat de la liga" label="Abrir chat">
          {feed.messages.length ? (
            feed.messages
              .slice()
              .reverse()
              .map((m) => (
                <article className="chat-message" key={m.id}>
                  <strong>{m.profiles?.display_name ?? 'Participante'}</strong>
                  <p>{m.body}</p>
                </article>
              ))
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="La conversación está por empezar"
              description="Los mensajes visibles de la liga aparecerán aquí."
            />
          )}
          <Link className="button secondary" href="/chat">
            Entrar en el chat
            <ArrowRight size={16} />
          </Link>
        </Popup>
      </section>
    </div>
  );
}

