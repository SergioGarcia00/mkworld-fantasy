import { PageHeading, EmptyState } from '@/components/ui';
import { leagueFeed } from '@/lib/public-data';
import { Newspaper } from 'lucide-react';
export const metadata = { title: 'Noticias' };
export default async function News() {
  const feed = await leagueFeed();
  return (
    <>
      <PageHeading
        title="A pie de pista"
        description="Anuncios, resultados y toda la actualidad oficial de Atlas League."
      />
      {feed.news.length ? (
        feed.news.map((n) => (
          <article className="news-article" key={n.id}>
            <span className="badge">{n.category}</span>
            <h2>{n.title}</h2>
            <time dateTime={n.created_at}>
              {new Intl.DateTimeFormat('es-ES', {
                dateStyle: 'long',
                timeZone: 'Europe/Madrid',
              }).format(new Date(n.created_at))}
            </time>
            <p>{n.body}</p>
          </article>
        ))
      ) : (
        <EmptyState
          title={feed.newsUnavailable ? 'Noticias no disponibles' : 'Todavía no hay noticias'}
          description={
            feed.newsUnavailable
              ? 'No se ha podido cargar la actualidad. Vuelve a intentarlo.'
              : 'Los anuncios oficiales de la competición aparecerán aquí cuando se publiquen.'
          }
          icon={Newspaper}
          href="/"
          label="Volver a vista general"
        />
      )}
    </>
  );
}
