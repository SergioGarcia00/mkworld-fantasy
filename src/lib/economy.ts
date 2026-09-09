export type EconomyConfig = {
  money_per_point: number;
  max_money_from_points_per_round: number;
  market_sell_percentage: number;
};

/** All amounts are integer euros; this module deliberately never uses floats for money. */
export function pointsReward(points: number, config: EconomyConfig) {
  const raw = Math.max(0, Math.trunc(points)) * config.money_per_point;
  return Math.min(raw, config.max_money_from_points_per_round);
}

export function immediateSalePrice(marketValue: number, percentage = 95) {
  return Math.floor((Math.max(0, marketValue) * Math.max(0, Math.min(100, percentage))) / 100);
}

export function calculateNetTransfer(price: number, feePercent = 3) {
  const amount = Math.max(0, Math.trunc(price));
  const fee = Math.floor((amount * Math.max(0, Math.min(100, feePercent))) / 100);
  return { sellerReceives: amount - fee, fee };
}

export function netWorth(balance: number, rosterValues: number[]) {
  return (
    Math.trunc(balance) +
    rosterValues.reduce((total, value) => total + Math.max(0, Math.trunc(value)), 0)
  );
}
