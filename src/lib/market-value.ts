export type ValueChange = {
  previousValue: number;
  newValue: number;
  changeAmount: number;
  rawChangePercent: number;
  appliedChangePercent: number;
  performanceFactor: number;
  demandFactor: number;
  mmrFactor: number;
};
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function calculateMarketValue(
  previousValue: number,
  performanceRatio: number,
  demandRatio: number,
  mmrRatio: number,
  maxChange = 10,
  minimum = 500_000,
  rounding = 50_000,
): ValueChange {
  const performanceFactor = clamp(performanceRatio * 4, -8, 8),
    demandFactor = clamp(demandRatio * 3, -3, 3),
    mmrFactor = clamp(mmrRatio, -1, 1);
  const rawChangePercent = performanceFactor + demandFactor + mmrFactor,
    appliedChangePercent = clamp(rawChangePercent, -maxChange, maxChange);
  const newValue = Math.max(
    minimum,
    Math.round((previousValue * (1 + appliedChangePercent / 100)) / rounding) * rounding,
  );
  return {
    previousValue,
    newValue,
    changeAmount: newValue - previousValue,
    rawChangePercent,
    appliedChangePercent,
    performanceFactor,
    demandFactor,
    mmrFactor,
  };
}
