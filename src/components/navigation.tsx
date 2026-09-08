'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Flag,
  CalendarDays,
  ShoppingBag,
  Trophy,
  ChartNoAxesCombined,
  History,
  BookOpen,
  LifeBuoy,
  ShieldCheck,
  Menu,
  X,
  ClipboardList,
} from 'lucide-react';
const links = [
  ['/', 'Vista general', LayoutDashboard],
  ['/my-team', 'Mi equipo', ShieldCheck],
  ['/market', 'Mercado', ShoppingBag],
  ['/scores', 'Puntuaciones', ClipboardList],
  ['/leagues', 'Clasificación', Trophy],
  ['/teams', 'Equipos', Users],
  ['/players', 'Pilotos', Flag],
  ['/calendar', 'Calendario', CalendarDays],
  ['/stats', 'Estadísticas', ChartNoAxesCombined],
  ['/history', 'Historial', History],
  ['/rules', 'Reglamento', BookOpen],
  ['/support', 'Soporte', LifeBuoy],
] as const;
export function Navigation({ admin = false }: { admin?: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="menu-button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="league-nav"
      >
        {open ? <X /> : <Menu />}
        <span>Menú</span>
      </button>
      <nav
        id="league-nav"
        className={`navigation ${open ? 'is-open' : ''}`}
        aria-label="Navegación principal"
      >
        {links.map(([href, label, Icon], i) => (
          <Link
            onClick={() => setOpen(false)}
            href={href}
            key={href}
            aria-current={
              (href === '/' ? path === href : path.startsWith(href)) ? 'page' : undefined
            }
            className={i === 5 || i === 11 ? 'nav-divider' : ''}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
        {admin && (
          <Link onClick={() => setOpen(false)} href="/admin">
            <ShieldCheck size={18} />
            Administración
          </Link>
        )}
      </nav>
    </>
  );
}
