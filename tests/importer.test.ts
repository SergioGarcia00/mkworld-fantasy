import { describe, it, expect } from 'vitest';
import { mapImport, importSummary, slugify } from '@/services/mkcentral/player-mapper';
import source from '../data/mkcentral-743-registrations.json';
describe('MKCentral importer', () => {
  it('imports the supplied tournament snapshot without inventing players', () => {
    const rows = mapImport(source);
    expect(rows).toHaveLength(1965);
    expect(new Set(rows.map((r) => r.teamKey)).size).toBe(121);
    expect(rows.every((r) => r.mkcentralId !== null)).toBe(true);
  });
  it('preserves Unicode names and deduplicates stable identities', () => {
    const rows = mapImport([
      { jugador: '星 ★ José', equipo: 'Équipe', mkcentral_player_id: 42 },
      { jugador: '星 ★ José', equipo: 'Équipe', mkcentral_player_id: 42 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('星 ★ José');
    expect(rows[0].sourceKey).toBe('mkcentral:42');
  });
  it('keeps stable MKCentral keys across renames and transfers', () => {
    expect(mapImport([{ jugador: 'A', equipo: 'T', mkcentral_player_id: 1 }])[0].sourceKey).toBe(
      mapImport([{ jugador: 'B', equipo: 'U', mkcentral_player_id: 1 }])[0].sourceKey,
    );
  });
  it('does not merge names from distinct teams without external IDs', () => {
    expect(
      mapImport([
        { jugador: 'Same', equipo: 'A' },
        { jugador: 'Same', equipo: 'B' },
      ]),
    ).toHaveLength(2);
  });
  it('normalizes equivalent manual identities', () => {
    expect(
      mapImport([
        { jugador: ' José ', equipo: ' Equipo ' },
        { jugador: 'José', equipo: 'Equipo' },
      ]),
    ).toHaveLength(1);
  });
  it('rejects conflicting registration identities', () => {
    expect(() =>
      mapImport([
        { jugador: 'A', equipo: 'T', mkcentral_player_id: 1 },
        { jugador: 'A', equipo: 'U', mkcentral_player_id: 1 },
      ]),
    ).toThrow('ambigua');
  });
  it.each([
    null,
    {},
    [],
    [{ jugador: '', equipo: 'Team' }],
    [{ jugador: 'A\u0000B', equipo: 'Team' }],
    [{ name: 'A', players: [{ name: 'B', player_id: -1 }] }],
  ])('rejects malformed input %j', (input) => {
    expect(() => mapImport(input)).toThrow();
  });
  it('previews new and updated records', () => {
    const rows = mapImport([
      { jugador: 'A', equipo: 'T' },
      { jugador: 'B', equipo: 'U' },
    ]);
    expect(importSummary(rows, [rows[0].sourceKey])).toEqual({
      players: 2,
      teams: 2,
      inserted: 1,
      updated: 1,
    });
  });
  it('creates Unicode-friendly slug bases without claiming they are unique', () => {
    expect(slugify('★ 星 José ★')).toBe('星-jose');
    expect(slugify('★')).toBe('player');
  });
});
