import { describe, expect, it } from 'vitest';
import { calculateMarketValue } from '@/lib/market-value';
describe('market value changes', () => {
  it('clamps and rounds changes', () => {
    const v = calculateMarketValue(10_000_000, 10, 0, 0);
    expect(v.appliedChangePercent).toBe(8);
    expect(v.newValue).toBe(10_800_000);
  });
  it('enforces weekly cap and minimum', () => {
    expect(calculateMarketValue(10_000_000, 10, 10, 10).appliedChangePercent).toBe(10);
    expect(calculateMarketValue(500_000, -10, -10, -10).newValue).toBe(500_000);
  });
  it('keeps neutral pilots stable', () =>
    expect(calculateMarketValue(12_000_000, 0, 0, 0).newValue).toBe(12_000_000));
});
