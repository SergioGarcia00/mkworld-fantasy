import { readFile } from 'node:fs/promises';
import { mapImport } from '../src/services/mkcentral/player-mapper';
import { SEASON_ID } from '../src/domain/config';
import { adminClient } from './client';
const path = process.argv[2] ?? 'data/mkcentral-743-registrations.json';
const rows = mapImport(JSON.parse((await readFile(path, 'utf8')).replace(/^\uFEFF/, '')));
const { data, error } = await adminClient().rpc('import_players', {
  payload: rows,
  target_season: process.argv[3] ?? SEASON_ID,
});
if (error) throw new Error(error.message);
console.log(data);
