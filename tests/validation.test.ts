import { describe, it, expect } from 'vitest';
import { signupSchema, playerEditSchema, teamEditSchema } from '@/domain/validation';
describe('server input validation', () => {
  it('rejects weak passwords and bad emails', () => {
    expect(
      signupSchema.safeParse({ email: 'bad', password: '123', displayName: 'Pilot' }).success,
    ).toBe(false);
  });
  it('ignores attempts to set the role during signup', () => {
    const data = signupSchema.parse({
      email: 'pilot@example.test',
      password: 'long-password-123',
      displayName: 'Pilot',
      role: 'ADMIN',
    });
    expect(data).not.toHaveProperty('role');
  });
  it('rejects negative and fractional prices', () => {
    const data = {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Pilot',
      team_id: '00000000-0000-4000-8000-000000000002',
      status: 'ACTIVE',
    };
    for (const price of [-1, 1.5, Infinity, 'oops'])
      expect(playerEditSchema.safeParse({ ...data, market_value: price }).success).toBe(false);
  });
  it('strips points and budget from player edits', () => {
    const data = playerEditSchema.parse({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Pilot',
      team_id: '00000000-0000-4000-8000-000000000002',
      status: 'ACTIVE',
      market_value: '1000',
      total_points: 1000,
      budget: 1e9,
    });
    expect(data).not.toHaveProperty('total_points');
    expect(data).not.toHaveProperty('budget');
  });
  it('rejects invalid team colors', () => {
    expect(
      teamEditSchema.safeParse({ id: '', name: 'T', tag: 'T', color: 'url(javascript:1)' }).success,
    ).toBe(false);
  });
});
