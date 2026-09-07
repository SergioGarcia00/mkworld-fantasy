import Link from 'next/link';
import { currentProfile } from '@/lib/auth';
import { signOut } from '@/app/auth/actions';
export const metadata = { title: 'Mi perfil' };
export default async function Profile() {
  const profile = await currentProfile();
  return (
    <section className="panel">
      <h1>{profile?.display_name ?? 'Tu cuenta'}</h1>
      {profile ? (
        <>
          <p className="muted">
            {profile.role === 'ADMIN' ? 'Administración' : 'Participante'} de Atlas League
          </p>
          <div className="toolbar">
            <Link className="button primary" href="/my-team">
              Mi equipo
            </Link>
            {profile.role === 'ADMIN' && (
              <Link className="button secondary" href="/admin">
                Administración
              </Link>
            )}
            <form action={signOut}>
              <button className="button secondary">Cerrar sesión</button>
            </form>
          </div>
        </>
      ) : (
        <>
          <p className="muted">Las cuentas de participantes se asignan desde administración.</p>
          <Link href="/login" className="button primary">
            Acceder
          </Link>
        </>
      )}
    </section>
  );
}
