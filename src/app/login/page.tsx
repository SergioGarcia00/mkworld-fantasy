import Link from 'next/link';
import { LoginForm } from '@/components/participant-forms';
import { isConfigured } from '@/lib/supabase/env';
export const metadata = { title: 'Acceder' };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ confirmation?: string }>;
}) {
  const params = await searchParams;
  return (
    <section className="panel participant-auth">
      <h1>Tu sitio en el paddock.</h1>
      <p className="muted">
        Accede con el usuario y la contraseña que te ha asignado la administración de Atlas League.
      </p>
      {params.confirmation === 'error' && (
        <p role="alert">
          El enlace ha caducado. Contacta con administración para recuperar el acceso.
        </p>
      )}
      <LoginForm configured={isConfigured()} />
      <p className="muted">
        ¿Vienes a seguir la competición? <Link href="/">Entra como espectador</Link>.
      </p>
    </section>
  );
}
