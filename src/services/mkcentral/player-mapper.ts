import { z } from 'zod';
import { nameSchema } from '@/domain/validation';
const externalId = z
  .union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)])
  .transform(String);
const flat = z.object({
  jugador: nameSchema,
  equipo: nameSchema,
  mkcentral_player_id: externalId.optional(),
});
const squad = z.object({
  id: externalId.optional(),
  name: nameSchema,
  tag: z.string().max(20).nullish(),
  players: z.array(z.object({ player_id: externalId.nullish(), name: nameSchema })).max(1000),
});
export interface ImportPlayer {
  name: string;
  teamName: string;
  teamTag: string;
  sourceKey: string;
  teamKey: string;
  slugBase: string;
  teamSlugBase: string;
  mkcentralId: string | null;
}
export function normalize(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}
export function slugify(value: string) {
  return (
    value
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100) || 'player'
  );
}
export function mapImport(input: unknown): ImportPlayer[] {
  const list = z.array(z.unknown()).min(1, 'El JSON está vacío.').max(10000).parse(input);
  const rows: ImportPlayer[] = [];
  if (typeof list[0] === 'object' && list[0] !== null && 'jugador' in list[0]) {
    for (const item of z.array(flat).parse(list))
      rows.push(make(item.jugador, item.equipo, '', item.mkcentral_player_id ?? null));
  } else {
    for (const item of z.array(squad).parse(list))
      for (const p of item.players)
        rows.push(make(p.name, item.name, item.tag ?? '', p.player_id ?? null));
  }
  if (!rows.length || rows.length > 10000)
    throw new Error('El archivo debe contener entre 1 y 10.000 jugadores.');
  const unique = new Map<string, ImportPlayer>();
  for (const row of rows) {
    const previous = unique.get(row.sourceKey);
    if (
      previous &&
      (previous.teamKey !== row.teamKey || normalize(previous.name) !== normalize(row.name))
    )
      throw new Error(`Identidad ambigua: ${row.name}. Revisa las inscripciones duplicadas.`);
    unique.set(row.sourceKey, row);
  }
  return [...unique.values()].sort(
    (a, b) => a.teamName.localeCompare(b.teamName, 'es') || a.name.localeCompare(b.name, 'es'),
  );
}
function make(
  name: string,
  teamName: string,
  teamTag: string,
  mkcentralId: string | null,
): ImportPlayer {
  // Team names reconcile both supplied flat exports and native MKCentral registrations.
  const teamKey = `team:${normalize(teamName)}`;
  return {
    name,
    teamName,
    teamTag,
    teamKey,
    mkcentralId,
    sourceKey: mkcentralId
      ? `mkcentral:${mkcentralId}`
      : `manual:${normalize(teamName)}:${normalize(name)}`,
    slugBase: slugify(name),
    teamSlugBase: slugify(teamName),
  };
}
export function importSummary(rows: ImportPlayer[], existing: Iterable<string>) {
  const known = new Set(existing);
  const updated = rows.filter((r) => known.has(r.sourceKey)).length;
  return {
    players: rows.length,
    teams: new Set(rows.map((r) => r.teamKey)).size,
    inserted: rows.length - updated,
    updated,
  };
}
