import Link from 'next/link';
import { type PublicPlayer, number, money } from '@/lib/public-data';
export function PlayerTable({ players }: { players: PublicPlayer[] }) {
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
                  <strong>{p.name}</strong>
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
