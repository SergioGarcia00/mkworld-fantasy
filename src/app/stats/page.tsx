import { PageHeading } from '@/components/ui';
import { PlayerTable } from '@/components/player-table';
import { publicCatalog, number } from '@/lib/public-data';
export const metadata = { title: 'Estadísticas' };
export default async function Stats() {
  const { players } = await publicCatalog();
  const known = players.filter((p) => p.mmr != null).sort((a, b) => (b.mmr ?? 0) - (a.mmr ?? 0));
  return (
    <>
      <PageHeading
        title="La parrilla, en números"
        description="Estadísticas del catálogo aportado: Season 3, formato 12 jugadores."
      />
      <div className="metrics-strip">
        {[
          [number(known.length), 'Pilotos con MMR'],
          [
            number(
              Math.round(known.reduce((s, p) => s + (p.mmr ?? 0), 0) / Math.max(known.length, 1)),
            ),
            'MMR medio',
          ],
          [number(known.filter((p) => (p.mmr ?? 0) > 9000).length), 'Por encima de 9.000'],
          [number(players.length - known.length), 'Sin MMR publicado'],
        ].map(([v, l]) => (
          <div key={l}>
            <strong>{v}</strong>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <h2 className="section-heading">Los 20 MMR más altos</h2>
      <PlayerTable players={known.slice(0, 20)} />
    </>
  );
}
