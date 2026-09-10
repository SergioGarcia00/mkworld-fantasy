import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { loadMarket } from '../src/lib/market-data';

type Result = { data: unknown; error?: unknown };
function database(overrides: Record<string, Result> = {}) {
  const results: Record<string, Result> = {
    market_offers: {
      data: [{ id: 'offer', player_id: 'pilot', players: { mkcentral_player_id: 42 } }],
    },
    player_enriched_details: { data: [{ mkcentral_player_id: 42, country: 'Spain' }] },
    fantasy_teams: { data: { id: 'team', budget: 100 } },
    fantasy_roster_players: { data: [{ player_id: 'owned' }] },
    market_bid_counts: { data: [{ player_id: 'pilot', bidder_count: 2 }] },
    my_market_bids: { data: [{ player_id: 'pilot' }] },
    ...overrides,
  };
  const calls: string[] = [];
  function query(name: string) {
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      in: () => builder,
      maybeSingle: () => builder,
      then(resolve: (value: Result) => unknown, reject: (error: unknown) => unknown) {
        calls.push(name);
        return new Promise<Result>((done) => setTimeout(() => done(results[name]), 100)).then(
          resolve,
          reject,
        );
      },
    };
    return builder;
  }
  return { db: { from: query, rpc: query }, calls };
}
afterEach(() => vi.useRealTimers());

it('loads the complete market in two network rounds instead of four', async () => {
  vi.useFakeTimers();
  const { db, calls } = database();
  let finished = false;
  const pending = loadMarket(db, 'user', '2026-09-07').then((result) => {
    finished = true;
    return result;
  });
  await vi.advanceTimersByTimeAsync(100);
  expect(finished).toBe(false);
  expect(calls).toHaveLength(6);
  await vi.advanceTimersByTimeAsync(100);
  expect(finished).toBe(true);
  const result = await pending;
  expect(result.team.budget).toBe(100);
  expect(result.owned).toEqual([{ player_id: 'owned' }]);
  expect(result.offers[0]).toMatchObject({
    bidderCount: 2,
    hasBid: true,
    detail: { country: 'Spain' },
  });
});

it('skips dependent queries for an empty market and missing team', async () => {
  vi.useFakeTimers();
  const { db, calls } = database({ market_offers: { data: [] }, fantasy_teams: { data: null } });
  const pending = loadMarket(db, 'user', '2026-09-07');
  await vi.runAllTimersAsync();
  expect(await pending).toEqual({ offers: [], team: null, owned: [] });
  expect(calls).not.toContain('player_enriched_details');
  expect(calls).not.toContain('fantasy_roster_players');
});

it('does not show an empty roster when the ownership query fails', async () => {
  vi.useFakeTimers();
  const { db } = database({ fantasy_roster_players: { data: null, error: 'unavailable' } });
  const assertion = expect(loadMarket(db, 'user', '2026-09-07')).rejects.toThrow('plantilla');
  await vi.runAllTimersAsync();
  await assertion;
});
