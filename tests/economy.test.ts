import { describe, expect, it } from 'vitest';
import { calculateNetTransfer, immediateSalePrice, netWorth, pointsReward } from '@/lib/economy';

describe('economy calculations', () => {
  const config = {
    money_per_point: 10_000,
    max_money_from_points_per_round: 12_000_000,
    market_sell_percentage: 95,
  };
  it('caps points rewards', () => expect(pointsReward(1500, config)).toBe(12_000_000));
  it('calculates sale and transfer amounts in integer euros', () => {
    expect(immediateSalePrice(10_000_000)).toBe(9_500_000);
    expect(calculateNetTransfer(20_000_000)).toEqual({ sellerReceives: 19_400_000, fee: 600_000 });
  });
  it('calculates net worth without changing balance', () =>
    expect(netWorth(16_400_000, [100_000_000, 28_700_000])).toBe(145_100_000));
});
