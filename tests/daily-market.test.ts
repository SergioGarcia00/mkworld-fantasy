import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { it, expect } from 'vitest';

it('daily market excludes every official roster before picking one player per club', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table teams(id int primary key, name text);
      create table players(id uuid primary key default gen_random_uuid(), team_id int, mmr int, status text);
      create table leagues(id int primary key, season_id uuid);
      create table app_config(id boolean, official_league_id int);
      create table fantasy_roster_players(player_id uuid, league_id int);
      create table market_offers(season_id uuid, week_start date, slot int, player_id uuid, mmr int);
      insert into leagues values (1, '00000000-0000-0000-0000-000000000001'), (2, '00000000-0000-0000-0000-000000000002');
      insert into app_config values (true, 1);
      insert into teams values (1, 'KARTNIVOROS'), (2, 'Clarity'), (3, 'brilliant');
      insert into players(team_id,mmr,status) values (1,6745,'ACTIVE'), (1,7000,'ACTIVE'), (2,8000,'ACTIVE'), (3,9000,'ACTIVE');
      insert into fantasy_roster_players select id,1 from players where mmr in (6745,8000);
      insert into fantasy_roster_players select id,2 from players where mmr=9000;
    `);
    await db.exec(await readFile('supabase/migrations/202610280001_exclude_owned_market_players.sql', 'utf8'));
    for (let i = 0; i < 15; i++) {
      const result = await db.query<{ n: number }>("select generate_weekly_market('00000000-0000-0000-0000-000000000001', '2026-10-28') n");
      expect(result.rows[0].n).toBe(2);
      const offers = await db.query<{ mmr: number }>('select mmr from market_offers order by mmr');
      expect(offers.rows.map((row) => row.mmr)).toEqual([7000,9000]);
    }
    await db.exec('insert into fantasy_roster_players select id,1 from players where mmr in (7000,9000)');
    expect((await db.query<{ n: number }>("select generate_weekly_market('00000000-0000-0000-0000-000000000001', '2026-10-28') n")).rows[0].n).toBe(0);
  } finally {
    await db.close();
  }
}, 20000);
