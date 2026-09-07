import { describe, it, expect } from 'vitest';
import { madridWeek } from '../src/components/participant-time';
describe('Madrid competition clock', () => {
  it('opens Monday at 01:00 local', () => {
    expect(madridWeek(new Date('2026-09-06T22:59:00Z')).marketOpen).toBe(false);
    expect(madridWeek(new Date('2026-09-06T23:00:00Z')).marketOpen).toBe(true);
  });
  it('closes Friday at 23:59 local', () => {
    expect(madridWeek(new Date('2026-09-11T21:58:59Z')).marketOpen).toBe(true);
    expect(madridWeek(new Date('2026-09-11T21:59:00Z')).marketOpen).toBe(false);
  });
  it('uses summer offset for the Saturday deadline', () => {
    expect(madridWeek(new Date('2026-09-07T12:00:00Z')).lineupClose).toBe(
      '2026-09-12T21:59:00.000Z',
    );
  });
  it('uses winter offset after clock change', () => {
    expect(madridWeek(new Date('2026-10-26T12:00:00Z')).lineupClose).toBe(
      '2026-10-31T22:59:00.000Z',
    );
  });
});
