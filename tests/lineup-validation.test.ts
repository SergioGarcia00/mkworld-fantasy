import { describe, expect, it } from 'vitest';
import { lineupBlocker, lineupBlockerMessage } from '@/app/lineup/validation';

describe('lineup guards', () => {
  it('allows a valid ten-player squad with non-negative budget', () => {
    expect(lineupBlocker(10, 0)).toBeNull();
    expect(lineupBlocker(8, 25000)).toBeNull();
  });

  it('blocks squads above ten players', () => {
    expect(lineupBlocker(11, 5000)).toBe('squad');
    expect(lineupBlockerMessage('squad')).toEqual([
      'Vende jugadores hasta quedarte con un máximo de 10 en la plantilla.',
    ]);
  });

  it('blocks a negative budget', () => {
    expect(lineupBlocker(10, -1)).toBe('budget');
    expect(lineupBlockerMessage('budget')).toEqual([
      'Vende jugadores hasta dejar el presupuesto en 0 € o más.',
    ]);
  });

  it('reports both actions when both rules fail', () => {
    expect(lineupBlocker(11, -100)).toBe('squad_budget');
    expect(lineupBlockerMessage('squad_budget')).toHaveLength(2);
  });
});
