import { describe, expect, it } from 'vitest';
import { lineupBlocker, lineupBlockerMessage } from '@/app/lineup/validation';

describe('lineup guards', () => {
  it('allows squads from six through ten players with non-negative budget', () => {
    expect(lineupBlocker(6, 0)).toBeNull();
    expect(lineupBlocker(8, 25000)).toBeNull();
    expect(lineupBlocker(10, 0)).toBeNull();
  });

  it('blocks squads below six or above ten players', () => {
    expect(lineupBlocker(5, 5000)).toBe('squad');
    expect(lineupBlocker(11, 5000)).toBe('squad');
    expect(lineupBlockerMessage('squad')).toEqual([
      'La plantilla debe tener entre 6 y 10 jugadores para guardar la alineación.',
    ]);
  });

  it('blocks a negative budget', () => {
    expect(lineupBlocker(10, -1)).toBe('budget');
    expect(lineupBlockerMessage('budget')).toEqual([
      'Vende jugadores hasta dejar el presupuesto en 0 € o más.',
    ]);
  });

  it('reports both actions when both rules fail', () => {
    expect(lineupBlocker(5, -100)).toBe('squad_budget');
    expect(lineupBlockerMessage('squad_budget')).toHaveLength(2);
  });
});
