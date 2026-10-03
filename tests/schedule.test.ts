import { describe, it, expect } from 'vitest';
import { madridWeek } from '../src/components/participant-time';
describe('Madrid competition clock', () => {
  it('keeps the market open without a gap after settlement', () => {
    expect(madridWeek(new Date('2026-09-06T22:59:00Z')).marketOpen).toBe(true);
    expect(madridWeek(new Date('2026-09-11T21:59:00Z')).marketOpen).toBe(true);
    expect(madridWeek(new Date('2026-09-11T22:59:00Z')).week).toBe('2026-09-07');
    expect(madridWeek(new Date('2026-09-11T22:59:00Z')).marketOpen).toBe(true);
    expect(madridWeek(new Date('2026-09-11T23:01:00Z')).week).toBe('2026-09-14');
  });
  it('uses summer offset for the Saturday deadline', () => {
    expect(madridWeek(new Date('2026-09-07T12:00:00Z')).lineupClose).toBe(
      '2026-09-13T16:00:00.000Z',
    );
  });
  it('uses winter offset after clock change', () => {
    expect(madridWeek(new Date('2026-10-26T12:00:00Z')).lineupClose).toBe(
      '2026-11-01T17:00:00.000Z',
    );
  });
});
