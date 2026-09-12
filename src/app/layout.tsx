import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Link from 'next/link';
import { Flag, ArrowUpRight, Eye, LogOut } from 'lucide-react';
import { Suspense } from 'react';
import { Navigation } from '@/components/navigation';
import { currentProfile } from '@/lib/auth';
import { signOut } from '@/app/auth/actions';
import { currentMatchday } from '@/lib/public-data';
import './globals.css';
import { practiceSettings } from '@/lib/practice';
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
export default function Layout({ children }: { children: React.ReactNode }) {
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
            <Suspense fallback={<Navigation />}>
              <ProfileNavigation />
            </Suspense>
            <div className="sidebar-footer">
              <span className="status-dot" /> Una liga. Toda la pista.
              <small>Mario Kart World</small>
            </div>
          </aside>
          <div className="main-shell">
            <header className="topbar">
              <span className="topbar-league">
                Atlas League <span>/</span>{' '}
                <Suspense fallback={<b aria-busy="true">Jornada…</b>}>
                  <MatchdayLabel />
                </Suspense>
              </span>
              <Suspense
                fallback={
                  <div className="topbar-actions" role="status">
                    Cargando cuenta…
                  </div>
                }
              >
                <AccountActions />
              </Suspense>
            </header>
            <main id="main">
              <Suspense fallback={null}>
                <PracticeNotice />
              </Suspense>
              {children}
            </main>
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

async function ProfileNavigation() {
  const profile = await currentProfile().catch(() => null);
  return <Navigation admin={profile?.role === 'ADMIN'} />;
}

async function MatchdayLabel() {
  const day = await currentMatchday();
  return <b>{day ? `Jornada ${String(day.number).padStart(2, '0')}` : 'Pretemporada'}</b>;
}

async function AccountActions() {
  const profile = await currentProfile().catch(() => null);
  return (
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
  );
}

async function PracticeNotice() {
  const settings = await practiceSettings();
  if (!settings?.test_mode) return null;
  return (
    <div className="panel" role="status">
      <strong>Liga de pruebas · control manual</strong>
      <p>
        Sin horarios automáticos. Mercado: {settings.test_market_open ? 'abierto' : 'cerrado'} ·
        Alineaciones: {settings.test_lineup_open ? 'abiertas' : 'cerradas'} · Puntos:{' '}
        {settings.test_scores_open ? 'abiertos' : 'cerrados'}. Los cambios se guardan en la liga
        actual.
      </p>
    </div>
  );
}
