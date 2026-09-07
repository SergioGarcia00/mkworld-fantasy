import Link from 'next/link';
import { ArrowUpRight, Flag, type LucideIcon } from 'lucide-react';
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  icon: Icon = Flag,
  href,
  label,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <Icon size={32} strokeWidth={1.3} />
      <h3>{title}</h3>
      <p>{description}</p>
      {href && (
        <Link className="text-link" href={href}>
          {label}
          <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
export const WEEKLY_SCHEDULE = [
  ['LUN', '01:00', 'Apertura del mercado'],
  ['VIE', '23:59', 'Cierre de fichajes'],
  ['SÁB', '23:59', 'Cierre de alineaciones'],
  ['DOM', '2 carreras', 'Día de competición'],
] as const;

export function Timeline() {
  return (
    <ol className="timeline">
      {WEEKLY_SCHEDULE.map(([day, time, label], i) => (
        <li key={day} className={i === 3 ? 'race' : ''}>
          <span className="timeline-dot" />
          <div>
            <strong>{day}</strong>
            <span>{time}</span>
          </div>
          <p>{label}</p>
        </li>
      ))}
    </ol>
  );
}
