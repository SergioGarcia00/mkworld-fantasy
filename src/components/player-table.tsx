import Link from 'next/link';
/* Enriched profile fields are maintained by the database migration. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { type PublicPlayer, number, money } from '@/lib/public-data';
export function PlayerTable({ players }: { players: PublicPlayer[] }) {
  const codes: Record<string, string> = { Spain:'es','United States':'us',Canada:'ca',France:'fr',Germany:'de',Italy:'it',Portugal:'pt','United Kingdom':'gb',Japan:'jp',Brazil:'br',Mexico:'mx',Chile:'cl',Argentina:'ar',Australia:'au',Netherlands:'nl',Belgium:'be',Sweden:'se',Norway:'no',Finland:'fi',Denmark:'dk',Poland:'pl',Austria:'at',Switzerland:'ch',Turkey:'tr',Lebanon:'lb' };
  return (
    <div className="table-scroll">
      <table className="data-table pilot-table">
        <thead>
          <tr>
            <th>Piloto</th>
            <th>Equipo</th>
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
                  <strong>{p.name}</strong>{(p.detail as any)?.country && codes[(p.detail as any).country] && <span className="table-flag" role="img" aria-label={`Bandera de ${(p.detail as any).country}`} style={{ backgroundImage: `url(https://flagcdn.com/w40/${codes[(p.detail as any).country]}.png)` }} />}
                </Link>
              </td>
              <td>
                <Link href={`/teams/${encodeURIComponent(p.team)}`}>{p.team}</Link>
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
