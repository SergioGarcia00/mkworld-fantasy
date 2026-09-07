import { writeFile } from 'node:fs/promises';
import { fetchRegistrations, TOURNAMENT } from '../src/services/mkcentral/tournament';
import { mapImport } from '../src/services/mkcentral/player-mapper';
const data = await fetchRegistrations();
const rows = mapImport(data);
const squads = new Map<
  string,
  { name: string; tag: string; players: { name: string; player_id: string | null }[] }
>();
for (const row of rows) {
  let squad = squads.get(row.teamKey);
  if (!squad) {
    squad = { name: row.teamName, tag: row.teamTag, players: [] };
    squads.set(row.teamKey, squad);
  }
  squad.players.push({ name: row.name, player_id: row.mkcentralId });
}
await writeFile(
  'data/mkcentral-743-registrations.json',
  JSON.stringify([...squads.values()], null, 2),
);
await writeFile(
  'data/atlas-league-season-3-jugadores.json',
  JSON.stringify(
    rows.map((r) => ({
      jugador: r.name,
      equipo: r.teamName,
      mkcentral_player_id: r.mkcentralId ?? undefined,
    })),
    null,
    2,
  ),
);
await writeFile(
  'data/source.json',
  JSON.stringify(
    {
      url: TOURNAMENT.registrationsUrl,
      fetched_at: new Date().toISOString(),
      players: rows.length,
      teams: new Set(rows.map((r) => r.teamKey)).size,
    },
    null,
    2,
  ),
);
console.log(
  `Exportados ${rows.length} jugadores. Ejecuta npm run import:players -- data/atlas-league-season-3-jugadores.json para importarlos.`,
);
