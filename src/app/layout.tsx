import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Link from 'next/link';
import { Flag, ArrowUpRight, Eye, LogOut } from 'lucide-react';
import { connection } from 'next/server';
import { Navigation } from '@/components/navigation';
import { currentProfile } from '@/lib/auth';
import { signOut } from '@/app/auth/actions';
import { leagueFeed } from '@/lib/public-data';
import './globals.css';
const body = localFont({
  src: '../../public/fonts/barlow-regular.ttf',
  variable: '--font-body',
  display: 'swap',
});
const display = localFont({
  src: '../../public/fonts/barlow-condensed-bold.ttf',
  variable: '--font-display',
  weight: '700',
  display: 'swap',
});
export const metadata: Metadata = {
  title: { default: 'MKWorld Fantasy · Atlas League', template: '%s · MKWorld Fantasy' },
  description:
    'Toda la competición Atlas League: pilotos, equipos, calendario y resultados. Dos carreras. Una plantilla. Toda la pista.',
};
export default async function Layout({ children }: { children: React.ReactNode }) {
  await connection();
  const [profile, feed] = await Promise.all([currentProfile().catch(() => null), leagueFeed()]);
  const day = feed.days.find((d) => d.status === 'OPEN' || d.status === 'UPCOMING');
  return (
    <html lang="es">
      <body className={`${body.variable} ${display.variable}`}>
        <a className="skip-link" href="#main">
          Saltar al contenido
        </a>
        <div className="app-shell">
          <aside className="sidebar">
            <Link className="brand" href="/" aria-label="MKWorld Fantasy, inicio">
              <Flag size={29} />
              <span>
                MKWORLD<small>FANTASY</small>
              </span>
            </Link>
            <div className="league-label">
              ATLAS LEAGUE <span>S03</span>
            </div>
            <Navigation admin={profile?.role === 'ADMIN'} />
            <div className="sidebar-footer">
              <span className="status-dot" /> Una liga. Toda la pista.
              <small>Mario Kart World</small>
            </div>
          </aside>
          <div className="main-shell">
            <header className="topbar">
              <span className="topbar-league">
                Atlas League <span>/</span>{' '}
                <b>{day ? `Jornada ${String(day.number).padStart(2, '0')}` : 'Pretemporada'}</b>
              </span>
              <div className="topbar-actions">
                <span className="viewer">
                  <Eye size={16} />
                  {profile ? profile.display_name : 'Modo espectador'}
                </span>
                <Link className="button secondary compact" href={profile ? '/profile' : '/login'}>
                  {profile ? 'Mi perfil' : 'Acceder'}
                  <ArrowUpRight size={16} />
                </Link>
                {profile && (
                  <form action={signOut}>
                    <button className="button secondary compact" type="submit">
                      Salir
                      <LogOut size={16} />
                    </button>
                  </form>
                )}
              </div>
            </header>
            <main id="main">{children}</main>
            <footer>
              <span>
                MKWorld Fantasy <b>Atlas League</b>
              </span>
              <span>Horario de Madrid · Proyecto independiente de Nintendo</span>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
