import { countryCode as resolveCountryCode } from '@/lib/country-code';
import Link from 'next/link';
/* Enriched profile fields are maintained by the database migration. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { type PublicPlayer, number, money } from '@/lib/public-data';
import { seedingFor } from '@/lib/season-seedings';
export function PlayerTable({ players }: { players: PublicPlayer[] }) {
  return (
    <div className="table-scroll">
      <table className="data-table pilot-table">
        <thead>
          <tr>
            <th>Piloto</th>
            <th>Equipo</th>
            <th>División</th>
            <th className="numeric">Posición Lounge</th>
            <th className="numeric">MMR</th>
            <th className="numeric">Precio</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={p.id}>
              <td>
                <Link className="pilot-name" href={`/players/${p.slug}`}>
                  <span className="driver-number">{String(i + 1).padStart(2, '0')}</span>
                  <strong>{p.name}</strong>
                  {(p.detail as any)?.country && resolveCountryCode((p.detail as any).country) && (
                    <span
                      className="table-flag"
                      role="img"
                      aria-label={`Bandera de ${(p.detail as any).country}`}
                      style={{
                        backgroundImage: `url(https://flagcdn.com/w40/${resolveCountryCode((p.detail as any).country)}.png)`,
                      }}
                    />
                  )}
                </Link>
              </td>
              <td>
                <Link href={`/teams/${encodeURIComponent(p.team)}`}>{p.team}</Link>
              </td>
              <td className="seeding-cell">
                {seedingFor(p.team) ? (
                  <span className="seeding-badge">
                    D{seedingFor(p.team)!.division} <i>C{seedingFor(p.team)!.conference}</i>
                  </span>
                ) : (
                  <span className="muted">No seeded</span>
                )}
              </td>
              <td className="numeric muted">{p.rank ? `#${number(p.rank)}` : '—'}</td>
              <td className="numeric mmr">{number(p.mmr)}</td>
              <td className="numeric">{money(p.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
