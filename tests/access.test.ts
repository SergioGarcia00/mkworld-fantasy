import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
const ADMIN = '00000000-0000-4000-8000-000000000010',
  USER = '00000000-0000-4000-8000-000000000020',
  SECOND = '00000000-0000-4000-8000-000000000021',
  THIRD = '00000000-0000-4000-8000-000000000022',
  LEGACY = '00000000-0000-4000-8000-000000000030',
  SEASON = '00000000-0000-4000-8000-000000000003';
let db: PGlite, league: string, day: string;
async function actor(id: string, role = 'authenticated') {
  await db.exec('reset role');
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",
    [id, role],
  );
  await db.exec(`set role ${role}`);
}
async function provision(id: string, name: string) {
  await db.query(
    'insert into auth.users(id,raw_user_meta_data,raw_app_meta_data) values($1,$2,$3)',
    [
      id,
      JSON.stringify({ display_name: name, role: 'ADMIN' }),
      JSON.stringify({ managed_account: true }),
    ],
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}',raw_app_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid(),auth.role() to anon,authenticated,service_role;`,
  );
  await db.exec(await readFile('supabase/migrations/202609060001_foundation.sql', 'utf8'));
  await db.exec(await readFile('supabase/seed.sql', 'utf8'));
  await db.query('insert into auth.users(id) values($1),($2)', [ADMIN, LEGACY]);
  await db.query("update profiles set role='ADMIN' where id=$1", [ADMIN]);
  await db.exec(await readFile('supabase/migrations/202609060002_managed_accounts.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/202609060003_single_official_league.sql', 'utf8'));
  await provision(USER, 'Pilot One');
  await provision(SECOND, 'Pilot Two');
  await provision(THIRD, 'Pilot Three');
  await actor(ADMIN);
  league = (
    await db.query<{ id: string }>('select initialize_official_league($1,$2) id', [
      'Liga Oficial',
      SEASON,
    ])
  ).rows[0].id;
  for (const [user, name] of [
    [USER, 'Team One'],
    [SECOND, 'Team Two'],
    [THIRD, 'Team Three'],
  ])
    await db.query('select enroll_official_participant($1,$2)', [user, name]);
  await db.query('select set_league_publication($1,true)', [league]);
  await db.exec('reset role');
  day = (
    await db.query<{ id: string }>('select id from matchdays where season_id=$1 and number=1', [
      SEASON,
    ])
  ).rows[0].id;
  await db.query("update matchdays set status='FINISHED' where id=$1", [day]);
  await db.query(
    `insert into fantasy_team_matchday_scores(fantasy_team_id,matchday_id,points,scoring_rule_id) select f.id,$1,case when f.user_id=$2 then 80 else 100 end,s.id from fantasy_teams f join scoring_rules s on s.season_id=$3 and s.version=1 where f.league_id=$4`,
    [day, THIRD, SEASON, league],
  );
});
afterEach(async () => {
  await db.exec('reset role');
});
afterAll(async () => {
  await db.close();
});
describe('single official league and managed accounts', () => {
  it('blocks public signup and unapproved legacy access', async () => {
    expect(
      (
        await db.query<{ access_enabled: boolean }>(
          'select access_enabled from profiles where id=$1',
          [LEGACY],
        )
      ).rows[0].access_enabled,
    ).toBe(false);
    await expect(
      db.query('insert into auth.users(id,raw_user_meta_data) values(gen_random_uuid(),$1)', [
        JSON.stringify({ managed_account: true, role: 'ADMIN' }),
      ]),
    ).rejects.toThrow('registro público');
  });
  it('does not trust a participant metadata role', async () => {
    expect(
      (await db.query<{ role: string }>('select role from profiles where id=$1', [USER])).rows[0]
        .role,
    ).toBe('USER');
  });
  it('only lets an admin initialize the official league once', async () => {
    await actor(USER);
    await expect(
      db.query('select initialize_official_league($1,$2)', ['Hack', SEASON]),
    ).rejects.toThrow('Solo administradores');
    await actor(ADMIN);
    await expect(
      db.query('select initialize_official_league($1,$2)', ['Second League', SEASON]),
    ).rejects.toThrow('ya está configurada');
    expect((await db.query('select * from official_league()')).rows).toHaveLength(1);
  });
  it('only lets an admin add participants to that one league', async () => {
    await actor(USER);
    await expect(
      db.query('select enroll_official_participant($1,$2)', [USER, 'Hack Team']),
    ).rejects.toThrow('Solo administradores');
    await actor('', 'service_role');
    await db.query('update fantasy_teams set budget=123 where user_id=$1', [USER]);
    await actor(ADMIN);
    await db.query('select enroll_official_participant($1,$2)', [USER, 'Replacement']);
    const { rows } = await db.query<{ budget: number; name: string }>(
      'select budget,name from fantasy_teams where user_id=$1',
      [USER],
    );
    expect(rows).toEqual([{ budget: 123, name: 'Team One' }]);
  });
  it('publishes one narrow public ranking without private data', async () => {
    await actor('', 'anon');
    const { rows } = await db.query<Record<string, unknown>>('select * from spectator_leagues()');
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(league);
    expect(Object.keys(rows[0]).sort()).toEqual(['id', 'name', 'participants', 'season_name']);
    const standings = await db.query<{ position: number; total_points: number }>(
      'select * from spectator_standings(null)',
    );
    expect(standings.rows.map((r) => Number(r.total_points))).toEqual([100, 100, 80]);
    expect(standings.rows.map((r) => Number(r.position))).toEqual([1, 1, 3]);
    await expect(db.exec('select invite_code from leagues')).rejects.toThrow();
    await expect(db.exec('select * from profiles')).rejects.toThrow();
    await expect(db.exec('select budget from fantasy_teams')).rejects.toThrow();
  });
  it('returns only finished matchdays and rejects foreign matchday ids', async () => {
    await actor('', 'anon');
    expect((await db.query('select * from spectator_matchdays()')).rows).toHaveLength(1);
    expect((await db.query('select * from spectator_standings($1)', [day])).rows).toHaveLength(3);
    expect(
      (await db.query('select * from spectator_standings(gen_random_uuid())')).rows,
    ).toHaveLength(0);
  });
  it('revokes private access without erasing the published history', async () => {
    await actor(ADMIN);
    await db.query('select set_participant_access($1,false)', [USER]);
    await actor(USER);
    expect(
      (await db.query<{ member: boolean }>('select is_league_member($1) member', [league])).rows[0]
        .member,
    ).toBe(false);
    expect((await db.query('select * from fantasy_teams')).rows).toHaveLength(0);
    await actor('', 'anon');
    expect((await db.query('select * from spectator_standings(null)')).rows).toHaveLength(3);
    await actor(ADMIN);
    await db.query('select set_participant_access($1,true)', [USER]);
  });
  it('does not let spectators write or withdraw the official league', async () => {
    await actor('', 'anon');
    await expect(db.exec('update fantasy_teams set budget=0')).rejects.toThrow();
    await expect(db.query('select set_league_publication($1,false)', [league])).rejects.toThrow();
  });
});
