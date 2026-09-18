import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import { beforeAll, afterAll, it, expect } from 'vitest';
const ADMIN = '00000000-0000-4000-8000-000000000001';
const USER = '00000000-0000-4000-8000-000000000002';
const SEASON = '00000000-0000-4000-8000-000000000003';
let db: PGlite, day: string, team: string, players: string[];
async function actor(id: string, role = 'authenticated') {
  await db.exec('reset role');
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",
    [id, role],
  );
  await db.exec(`set role ${role}`);
}
async function controls(market = true, lineup = true, scores = true, enabled = true) {
  await actor(ADMIN);
  await db.query('select admin_test_controls($1,$2,$3,$4,$5)', [
    enabled,
    market,
    lineup,
    scores,
    day,
  ]);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}',raw_app_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;
  grant usage on schema public,auth to anon,authenticated,service_role; grant execute on function auth.uid(),auth.role() to anon,authenticated,service_role;`);
  for (const file of (await readdir('supabase/migrations')).sort()) {
    if (file.includes('_demo_') || file.includes('_copy_demo_')) continue;
    const sql = await readFile('supabase/migrations/' + file, 'utf8');
    // Historical migrations introduce enum values and use them in the same file.
    // Commit those additions first, as required by PostgreSQL.
    for (const match of sql.matchAll(
      /alter type public\.transaction_type add value if not exists '[^']+';/g,
    ))
      await db.exec(match[0]);
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(file + ': ' + String(error), { cause: error });
    }
    if (file === '202609060001_foundation.sql')
      await db.exec(await readFile('supabase/seed.sql', 'utf8'));
  }
  await db.exec(await readFile('supabase/seed.sql', 'utf8'));
  await db.query(
    `insert into auth.users(id,raw_app_meta_data) values($1,'{"managed_account":true}'),($2,'{"managed_account":true}');`,
    [ADMIN, USER],
  );
  await db.query("update profiles set role='ADMIN' where id=$1", [ADMIN]);
  await actor(ADMIN);
  await db.query('select initialize_official_league($1,$2)', ['Beta', SEASON]);
  await db.exec('reset role');
  await db.exec("update leagues set is_public=true where name='Beta'");
  await db.query('select enroll_official_participant($1,$2)', [USER, 'Beta team']);
  day = (
    await db.query<{ id: string }>("select admin_create_test_matchday('Prueba sin fechas') id")
  ).rows[0].id;
  await db.exec('reset role');
  await db.exec('update app_config set squad_size=10,starter_size=6');
  team = (await db.query<{ id: string }>('select id from fantasy_teams where user_id=$1', [USER]))
    .rows[0].id;
  await db.exec(
    "insert into teams(source_key,name,slug,tag) values('beta','Beta','beta','B'),('code','Code Genius','code','CG'); insert into players(source_key,name,slug,team_id,market_value,initial_value,mmr) select 'beta-'||n,'Pilot '||n,'beta-'||n,(select id from teams where source_key='beta'),100,100,case when n in (22,23) then 9500 when n=24 then 3000 else 4500 end from generate_series(1,24) n; insert into players(source_key,name,slug,team_id,market_value,initial_value,mmr) values('code-1','Code Pilot','code-pilot',(select id from teams where source_key='code'),100,100,3000);",
  );
  players = (
    await db.query<{ id: string }>(
      "select id from players where source_key like 'beta-%' order by source_key",
    )
  ).rows.map((p) => p.id);
  await db.query(
    'insert into fantasy_roster_players(fantasy_team_id,league_id,player_id,purchase_price) select $1,league_id,p.id,100 from fantasy_teams cross join players p where fantasy_teams.id=$1 and p.id=any($2::uuid[])',
    [team, players.slice(0, 10)],
  );
  await db.query(
    "update matchdays set lock_at='2000-01-01',start_at='2000-01-02',end_at='2000-01-03',status='OPEN' where id=$1",
    [day],
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});

it('only admins can activate manual mode', async () => {
  await actor(USER);
  await expect(
    db.query('select admin_test_controls(true,true,true,true,$1)', [day]),
  ).rejects.toThrow('Solo administradores');
});
it('ignores expired dates and does not auto-close when all six scores are complete', async () => {
  await controls();
  await actor(USER);
  await db.query('select save_lineup($1,$2,$3::uuid[],$4)', [
    team,
    day,
    players.slice(0, 6),
    players[0],
  ]);
  for (const player of players.slice(0, 6))
    await db.query('select submit_player_weekly_score($1,$2,$3,100,100)', [team, day, player]);
  expect(
    (await db.query<{ status: string }>('select status from matchdays where id=$1', [day])).rows[0]
      .status,
  ).toBe('OPEN');
});
it('independently closes lineups and score entry including direct table writes', async () => {
  await controls(true, false, true);
  await actor(USER);
  await expect(
    db.query('select save_lineup($1,$2,$3::uuid[],$4)', [
      team,
      day,
      players.slice(0, 6),
      players[0],
    ]),
  ).rejects.toThrow('Alineaciones cerradas');
  await db.query('select submit_player_weekly_score($1,$2,$3,120,120)', [team, day, players[0]]);
  await controls(true, true, false);
  await actor(USER);
  await expect(
    db.query('select submit_player_weekly_score($1,$2,$3,120,120)', [team, day, players[0]]),
  ).rejects.toThrow('Envío de puntos cerrado');
  await expect(
    db.query('update player_weekly_inputs set game_one=99 where matchday_id=$1', [day]),
  ).rejects.toThrow(/Envío de puntos cerrado|permission denied/);
});
it('pins the market to an old week, enforces closure and settles exactly once', async () => {
  await controls();
  await db.exec('reset role');
  await db.exec("update app_config set test_market_week='2000-01-03' where id=true");
  await db.query(
    "insert into market_offers(season_id,week_start,slot,player_id,mmr) values($1,'2000-01-03',1,$2,4500)",
    [SEASON, players[10]],
  );
  await actor(USER);
  await db.query('select place_market_bid($1,$2,150)', [team, players[10]]);
  await controls(false);
  await actor(USER);
  await expect(db.query('select place_market_bid($1,$2,160)', [team, players[10]])).rejects.toThrow(
    'El mercado está cerrado',
  );
  await db.query('select sell_player($1,$2)', [team, players[0]]);
  await db.exec('reset role');
  await db.query(
    'insert into fantasy_roster_players(fantasy_team_id,league_id,player_id,purchase_price) values($1,(select league_id from fantasy_teams where id=$1),$2,100)',
    [team, players[0]],
  );
  await actor(ADMIN);
  expect((await db.query<{ n: number }>('select admin_test_settle_market() n')).rows[0].n).toBe(1);
  expect((await db.query<{ n: number }>('select admin_test_settle_market() n')).rows[0].n).toBe(0);
  await db.exec('reset role');
  expect(
    (
      await db.query(
        'select * from fantasy_roster_players where fantasy_team_id=$1 and player_id=$2',
        [team, players[10]],
      )
    ).rows,
  ).toHaveLength(1);
  const nextMarket = (await db.query<{ open: boolean; week: string }>('select test_market_open open,test_market_week::text week from app_config where id=true')).rows[0];
  expect(nextMarket.open).toBe(true);
  expect(nextMarket.week).not.toBe('2000-01-03');
  expect((await db.query('select id from market_offers where week_start=$1', [nextMarket.week])).rows).toHaveLength(10);
  expect((await db.query("select title from news_posts where category='Mercado' and title like 'Subasta ganada ·%'" )).rows).toHaveLength(1);
  await db.exec('reset role');
  await db.query('delete from fantasy_roster_players where fantasy_team_id=$1 and player_id=$2', [team, players[10]]);
  expect(
    (
      await db.query("select * from fantasy_transactions where player_id=$1 and type='BUY'", [
        players[10],
      ])
    ).rows,
  ).toHaveLength(1);
});
it('scheduled market generation cannot replace the manual market', async () => {
  await db.exec('reset role');
  expect(
    (await db.query<{ n: number }>('select generate_weekly_market($1,null) n', [SEASON])).rows[0].n,
  ).toBe(0);
});
it('restores normal deadline checks when manual mode is disabled', async () => {
  await controls(false, false, false, false);
  await actor(USER);
  await expect(
    db.query('select save_lineup($1,$2,$3::uuid[],$4)', [
      team,
      day,
      players.slice(0, 6),
      players[0],
    ]),
  ).rejects.toThrow('El plazo de alineación ha terminado');
});

it('validates titular count and captain before saving a lineup', async () => {
  await controls();
  await actor(USER);
  await expect(
    db.query('select save_lineup($1,$2,$3::uuid[],$4)', [team, day, players.slice(0, 5), players[0]]),
  ).rejects.toThrow('exactamente 6 titulares');
  await expect(
    db.query('select save_lineup($1,$2,$3::uuid[],$4)', [team, day, players.slice(0, 7), players[0]]),
  ).rejects.toThrow('exactamente 6 titulares');
  await expect(
    db.query('select save_lineup($1,$2,$3::uuid[],$4)', [team, day, players.slice(0, 6), players[6]]),
  ).rejects.toThrow('El capitán debe ser titular');
  await db.query('select save_lineup($1,$2,$3::uuid[],$4)', [team, day, players.slice(0, 6), players[2]]);
  await db.exec('reset role');
  expect(
    (await db.query<{ n: number }>('select count(*)::int n from fantasy_lineup_players lp join fantasy_lineups l on l.id=lp.lineup_id where l.fantasy_team_id=$1 and l.matchday_id=$2 and lp.is_starter', [team, day])).rows[0].n,
  ).toBe(6);
  expect(
    (await db.query<{ player_id: string }>('select player_id from fantasy_lineup_players lp join fantasy_lineups l on l.id=lp.lineup_id where l.fantasy_team_id=$1 and l.matchday_id=$2 and lp.is_captain', [team, day])).rows[0].player_id,
  ).toBe(players[2]);
});

it('stores postponed scores as pending and allows completing them later', async () => {
  await controls();
  await actor(USER);
  await db.query('select submit_player_weekly_score($1,$2,$3,0,0,true)', [team, day, players[0]]);
  await db.exec('reset role');
  let input = (await db.query<{ game_one: number; game_two: number; postponed: boolean }>('select game_one,game_two,postponed from player_weekly_inputs where fantasy_team_id=$1 and matchday_id=$2 and player_id=$3', [team, day, players[0]])).rows[0];
  expect(input).toMatchObject({ game_one: 0, game_two: 0, postponed: true });
  await actor(USER);
  await db.query('select submit_player_weekly_score($1,$2,$3,80,90,false)', [team, day, players[0]]);
  await db.exec('reset role');
  input = (await db.query<{ game_one: number; game_two: number; postponed: boolean }>('select game_one,game_two,postponed from player_weekly_inputs where fantasy_team_id=$1 and matchday_id=$2 and player_id=$3', [team, day, players[0]])).rows[0];
  expect(input).toMatchObject({ game_one: 80, game_two: 90, postponed: false });
  // Leave the shared practice fixture deterministic for the final scoring test.
  await db.query('select submit_player_weekly_score($1,$2,$3,120,120,false)', [team, day, players[0]]);
  await db.query('select save_lineup($1,$2,$3::uuid[],$4)', [team, day, players.slice(0, 6), players[0]]);
});

it('publishes player statistics only after a matchday is validated', async () => {
  await actor('');
  expect((await db.query('select * from public_player_weekly_stats()')).rows).toHaveLength(0);
});

it('exposes public rosters without exposing private fantasy team data', async () => {
  await actor('', 'anon');
  const rows = await db.query<{ player_id: string; fantasy_team_name: string }>('select player_id,fantasy_team_name from spectator_users()');
  expect(rows.rows).toHaveLength(10);
  expect(rows.rows[0].fantasy_team_name).toBe('Beta team');
  await expect(db.query('select budget from fantasy_teams')).rejects.toThrow();
  await expect(db.query('select id from profiles')).rejects.toThrow();
});

it('lets spectators read chat but prevents anonymous publishing', async () => {
  await actor(USER);
  await db.query('insert into chat_messages(user_id,body) values($1,$2)', [USER, 'Mensaje de prueba']);
  await actor('', 'anon');
  expect((await db.query('select * from spectator_chat()')).rows).toHaveLength(1);
  await expect(
    db.query('insert into chat_messages(user_id,body) values($1,$2)', [USER, 'No debería entrar']),
  ).rejects.toThrow();
});

it('finalizes manually, calculates points and pays rewards only once', async () => {
  await controls();
  await db.query("select admin_set_matchday_status($1,'FINISHED')", [day]);
  await db.exec('reset role');
  const before = (
    await db.query<{ budget: number }>('select budget from fantasy_teams where id=$1', [team])
  ).rows[0].budget;
  expect(
    Number(
      (
        await db.query<{ points: number }>(
          'select points from fantasy_team_matchday_scores where matchday_id=$1 and fantasy_team_id=$2',
          [day, team],
        )
      ).rows[0].points,
    ),
  ).toBe(1360);
  expect((await db.query('select * from public_player_weekly_stats()')).rows.length).toBeGreaterThan(0);
  await actor(ADMIN);
  await db.query("select admin_set_matchday_status($1,'FINISHED')", [day]);
  await db.exec('reset role');
  expect(
    (await db.query<{ budget: number }>('select budget from fantasy_teams where id=$1', [team]))
      .rows[0].budget,
  ).toBe(before);
  await actor(USER);
  await expect(
    db.query('select submit_player_weekly_score($1,$2,$3,100,100)', [team, day, players[0]]),
  ).rejects.toThrow('Envío de puntos cerrado');
});
