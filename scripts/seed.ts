import { readFile, access } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { adminClient } from './client';
import { mapImport } from '../src/services/mkcentral/player-mapper';
import { SEASON_ID } from '../src/domain/config';
import { credentialsSchema } from '../src/domain/validation';
const credentials = credentialsSchema.parse({
  email: process.env.DEV_ADMIN_EMAIL,
  password: process.env.DEV_ADMIN_PASSWORD,
});
const db = adminClient();
function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
check(
  (
    await db
      .from('seasons')
      .upsert(
        { id: SEASON_ID, name: 'Atlas League Season 3', slug: 'atlas-league-season-3' },
        { onConflict: 'slug' },
      )
  ).error,
);
check(
  (
    await db.from('scoring_rules').upsert(
      {
        season_id: SEASON_ID,
        version: 1,
        rules: {
          baseMultiplier: 1,
          winBonus: 5,
          mvpBonus: 10,
          teamBestBonus: 5,
          administrativePenalty: 0,
        },
      },
      { onConflict: 'season_id,version', ignoreDuplicates: true },
    )
  ).error,
);
const seededAt = Date.now();
check(
  (
    await db.from('matchdays').upsert(
      [1, 2, 3].map((number) => {
        const start = seededAt + number * 7 * 24 * 60 * 60 * 1000;
        return {
          season_id: SEASON_ID,
          number,
          name: `Jornada DEMO ${number}`,
          start_at: new Date(start).toISOString(),
          lock_at: new Date(start - 60 * 60 * 1000).toISOString(),
          end_at: new Date(start + 24 * 60 * 60 * 1000).toISOString(),
        };
      }),
      { onConflict: 'season_id,number', ignoreDuplicates: true },
    )
  ).error,
);
let userId: string | undefined;
for (let page = 1; !userId; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
  check(error);
  userId = data.users.find((u) => u.email === credentials.email)?.id;
  if (data.users.length < 1000) break;
}
if (!userId) {
  const { data, error } = await db.auth.admin.createUser({
    ...credentials,
    email_confirm: true,
    app_metadata: { managed_account: true },
    user_metadata: { display_name: 'Admin de desarrollo' },
  });
  check(error);
  userId = data.user!.id;
}
check(
  (await db.from('profiles').update({ role: 'ADMIN', access_enabled: true }).eq('id', userId))
    .error,
);
let file = 'data/mkcentral-743-registrations.json';
for (const candidate of [
  'players.json',
  'jugadores.json',
  'atlas-league-season-3-jugadores.json',
  'atlas_players.json',
  'data/atlas-league-season-3-jugadores.json',
]) {
  try {
    await access(candidate);
    file = candidate;
    break;
  } catch {}
}
const rows = mapImport(JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, '')));
const imported = await db.rpc('import_players', { payload: rows, target_season: SEASON_ID });
check(imported.error);
const { data: config, error: configError } = await db.from('app_config').select('*').single();
check(configError);
let leagueId = config.official_league_id;
if (!leagueId) {
  leagueId = randomUUID();
  const { id: _, initial_player_value: __, official_league_id: ___, ...rules } = config;
  void _;
  void __;
  void ___;
  check(
    (
      await db.from('leagues').insert({
        ...rules,
        id: leagueId,
        owner_id: userId,
        season_id: SEASON_ID,
        name: 'Liga DEMO — desarrollo',
        invite_code: randomUUID().replaceAll('-', ''),
      })
    ).error,
  );
  check(
    (await db.from('app_config').update({ official_league_id: leagueId }).eq('id', true)).error,
  );
}
check(
  (
    await db
      .from('league_members')
      .upsert(
        { league_id: leagueId, user_id: userId },
        { onConflict: 'league_id,user_id', ignoreDuplicates: true },
      )
  ).error,
);
check(
  (
    await db.from('fantasy_teams').upsert(
      {
        league_id: leagueId,
        user_id: userId,
        name: 'Paddock DEMO',
        budget: config.starting_budget,
      },
      { onConflict: 'league_id,user_id', ignoreDuplicates: true },
    )
  ).error,
);
console.log(
  'Seed completado. Catálogo real; liga oficial y calendario DEMO. No se imprime la contraseña.',
  imported.data,
);


