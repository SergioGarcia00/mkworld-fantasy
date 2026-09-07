import { readFile, writeFile } from 'node:fs/promises';

type Player = { player_id: number; jugador: string; equipo: string; mmr_s3_12p: number | null };
const source = JSON.parse(await readFile('data/atlas-fantasy-s3-mmr-FINAL.json', 'utf8')) as { jugadores: Player[] };
const usable = source.jugadores.filter((p) => Number.isFinite(p.mmr_s3_12p));
function pick(pool: Player[], count: number) {
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}
const high = pick(usable.filter((p) => p.mmr_s3_12p! > 9000), 2);
const mid = pick(usable.filter((p) => p.mmr_s3_12p! >= 4000 && p.mmr_s3_12p! <= 5000), 6);
const low = pick(usable.filter((p) => p.mmr_s3_12p! < 4000 && !p.equipo.toLowerCase().includes('code genius')), 1);
const code = pick(usable.filter((p) => p.equipo.toLowerCase() === 'code genius'), 1);
if ([high, mid, low, code].some((group) => group.length === 0)) throw new Error('No hay suficientes jugadores para generar el mercado.');
const market = [...high, ...mid, ...low, ...code].map((p, index) => ({ slot: index + 1, playerId: p.player_id, name: p.jugador, team: p.equipo, mmr: p.mmr_s3_12p }));
await writeFile('data/current-market.json', JSON.stringify({ generatedAt: new Date().toISOString(), players: market }, null, 2));
console.table(market);
