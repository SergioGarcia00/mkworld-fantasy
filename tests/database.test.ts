import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import { mapImport } from '@/services/mkcentral/player-mapper';
import source from '../data/mkcentral-743-registrations.json';
const ADMIN = '00000000-0000-4000-8000-000000000001',
  USER = '00000000-0000-4000-8000-000000000002',
  SEASON = '00000000-0000-4000-8000-000000000003';
let db: PGlite;
async function actor(id: string, role = 'authenticated') {
  await db.exec('reset role');
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",
    [id, role],
  );
  await db.exec(`set role ${role}`);
}
async function imported(rows: unknown) {
  return db.query<{ result: { inserted: number; updated: number; teams: number } }>(
    'select public.import_players($1::jsonb,$2::uuid) result',
    [JSON.stringify(rows), SEASON],
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
 create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
 create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;
 grant usage on schema public,auth to anon,authenticated,service_role;
 grant execute on function auth.uid(),auth.role() to anon,authenticated,service_role;
 `);
  await db.exec(await readFile('supabase/migrations/202609060001_foundation.sql', 'utf8'));
  await db.exec(await readFile('supabase/seed.sql', 'utf8'));
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2),($3,$4)', [
    ADMIN,
    JSON.stringify({ display_name: 'Admin' }),
    USER,
    JSON.stringify({ display_name: 'Pilot', role: 'ADMIN' }),
  ]);
  await db.query("update public.profiles set role='ADMIN' where id=$1", [ADMIN]);
});
afterEach(async () => {
  await db.exec('reset role');
});
afterAll(async () => {
  await db.close();
});
describe('real PostgreSQL migration and permissions (PGlite)', () => {
  it('creates user profiles without trusting a metadata role', async () => {
    const { rows } = await db.query<{ role: string }>('select role from profiles where id=$1', [
      USER,
    ]);
    expect(rows[0].role).toBe('USER');
  });
  it('enables RLS on every application table', async () => {
    const { rows } = await db.query(
      "select relname from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r' and not relrowsecurity",
    );
    expect(rows).toHaveLength(0);
  });
  it('imports all real source rows transactionally and is safe to repeat', async () => {
    await actor(ADMIN);
    const first = await imported(mapImport(source));
    expect(first.rows[0].result).toEqual({ inserted: 1965, updated: 0, teams: 121 });
    const second = await imported(mapImport(source));
    expect(second.rows[0].result).toEqual({ inserted: 0, updated: 1965, teams: 121 });
    expect((await db.query('select * from players')).rows).toHaveLength(1965);
    expect((await db.query('select * from player_market_value_history')).rows).toHaveLength(1965);
  });
  it('does not overwrite existing prices on reimport and records adjustments once', async () => {
    await actor(ADMIN);
    const row = mapImport(source)[0];
    await db.query('update players set market_value=17000000 where source_key=$1', [row.sourceKey]);
    await imported([row]);
    const { rows } = await db.query<{ market_value: number }>(
      'select market_value from players where source_key=$1',
      [row.sourceKey],
    );
    expect(Number(rows[0].market_value)).toBe(17000000);
    const count = await db.query<{ count: number }>(
      'select count(*) from player_market_value_history where player_id=(select id from players where source_key=$1)',
      [row.sourceKey],
    );
    expect(Number(count.rows[0].count)).toBe(2);
  });
  it('rolls back the entire import when a later row is malformed', async () => {
    await actor(ADMIN);
    const row = mapImport([{ jugador: 'Atomic player', equipo: 'Atomic team' }])[0];
    await expect(imported([row, { ...row, sourceKey: 'bad', name: '' }])).rejects.toThrow();
    expect(
      (await db.query('select id from players where source_key=$1', [row.sourceKey])).rows,
    ).toHaveLength(0);
    expect(
      (await db.query('select id from teams where source_key=$1', [row.teamKey])).rows,
    ).toHaveLength(0);
  });
  it('denies imports to normal users at the database boundary', async () => {
    await actor(USER);
    await expect(imported(mapImport(source).slice(0, 1))).rejects.toThrow('Solo administradores');
  });
  it('denies anonymous imports but allows public catalog reads', async () => {
    await actor('', 'anon');
    await expect(imported(mapImport(source).slice(0, 1))).rejects.toThrow();
    expect((await db.query('select id from players limit 1')).rows).toHaveLength(1);
  });
  it('prevents normal users from changing player prices or creating players', async () => {
    await actor(USER);
    const updated = await db.query('update players set market_value=0 returning id');
    expect(updated.rows).toHaveLength(0);
    await expect(
      db.exec(
        "insert into players(source_key,name,slug,team_id,market_value,initial_value) select 'hack','hack','hack',id,0,0 from teams limit 1",
      ),
    ).rejects.toThrow();
  });
  it('prevents self-promotion and arbitrary budget, points and result writes', async () => {
    await actor(USER);
    await expect(
      db.query("update profiles set role='ADMIN' where id=$1", [USER]),
    ).rejects.toThrow();
    await expect(db.exec('update fantasy_teams set budget=999999999')).rejects.toThrow();
    await expect(db.exec('update player_matchday_scores set points=999999')).rejects.toThrow();
    await expect(db.exec('update matches set home_score=999')).rejects.toThrow();
  });
  it('hides other profiles from a normal user', async () => {
    await actor(USER);
    const { rows } = await db.query<{ id: string }>('select id from profiles');
    expect(rows.map((r) => r.id)).toEqual([USER]);
  });
  it('rejects negative market values even for administrators', async () => {
    await actor(ADMIN);
    await expect(db.exec('update players set market_value=-1')).rejects.toThrow();
  });
  it('retains season memberships when a player moves in another season', async () => {
    const sid = '00000000-0000-4000-8000-000000000004';
    await db.query("insert into seasons(id,name,slug) values($1,'Season 4','season-4')", [sid]);
    const row = mapImport(source)[1];
    const { rows: before } = await db.query<{ team_id: string }>(
      'select team_id from player_seasons where player_id=(select id from players where source_key=$1) and season_id=$2',
      [row.sourceKey, SEASON],
    );
    await actor(ADMIN);
    await db.query('select import_players($1::jsonb,$2::uuid)', [
      JSON.stringify([
        {
          ...row,
          teamKey: 'team:new-season',
          teamName: 'New Season Team',
          teamSlugBase: 'new-season',
        },
      ]),
      sid,
    ]);
    const { rows: after } = await db.query<{ team_id: string }>(
      'select team_id from player_seasons where player_id=(select id from players where source_key=$1) and season_id=$2',
      [row.sourceKey, SEASON],
    );
    expect(after).toEqual(before);
  });
  it('protects player deletion so historical references cannot disappear', async () => {
    await actor(ADMIN);
    await expect(db.exec('delete from players')).rejects.toThrow();
  });
});
