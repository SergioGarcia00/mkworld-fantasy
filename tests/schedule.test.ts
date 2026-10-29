import { describe, it, expect } from 'vitest';
import { madridWeek } from '../src/components/participant-time';
describe('Madrid daily competition clock', () => {
  it('uses the Madrid calendar date for the daily market', () => {
    expect(madridWeek(new Date('2026-10-28T23:30:00Z')).week).toBe('2026-10-29');
    expect(madridWeek(new Date('2026-10-29T00:30:00Z')).marketOpen).toBe(true);
  });
  it('keeps the market closed until 01:00 Madrid', () => {
    expect(madridWeek(new Date('2026-10-28T23:59:00Z')).marketOpen).toBe(false);
    expect(madridWeek(new Date('2026-10-29T00:00:00Z')).marketOpen).toBe(true);
  });
  it('closes the daily market and lineup at the next Madrid deadlines', () => {
    const clock = madridWeek(new Date('2026-10-29T12:00:00Z'));
    expect(clock.marketClose).toBe('2026-10-29T23:00:00.000Z');
    expect(clock.lineupClose).toBe('2026-10-30T17:00:00.000Z');
  });
});
