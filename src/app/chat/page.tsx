import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { PageHeading, EmptyState } from '@/components/ui';
import { ChatForm } from '@/components/chat-form';
import { leagueFeed } from '@/lib/public-data';
import { currentProfile } from '@/lib/auth';
export const metadata = { title: 'Chat de la liga' };
export default async function Chat() {
  const [feed, profile] = await Promise.all([leagueFeed(), currentProfile()]);
  return (
    <>
      <PageHeading
        title="El paddock de Atlas"
        description="La conversación de la liga, abierta a espectadores. Accede para participar."
      />
      <section className="panel">
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
            title={
              'chatUnavailable' in feed && feed.chatUnavailable
                ? 'El chat público todavía no está disponible'
                : 'La conversación está por empezar'
            }
            description="Los mensajes públicos aparecerán aquí. Puedes seguir consultando el resto de la competición."
            icon={MessageSquare}
          />
        )}
      </section>
      {profile ? (
        <ChatForm />
      ) : (
        <Link className="button primary" href="/login">
          Acceder para escribir
        </Link>
      )}
    </>
  );
}
