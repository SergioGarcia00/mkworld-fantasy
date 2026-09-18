-- Official Atlas League Season 3 divisions and conferences.
-- Kept separate from team_seasons so the competition structure is explicit and queryable.
create table if not exists public.season_team_seedings (
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  division integer not null check (division between 1 and 15),
  conference text not null check (conference in ('A', 'B')),
  primary key (season_id, team_id)
);

create index if not exists season_team_seedings_lookup
  on public.season_team_seedings (season_id, division, conference);

insert into public.season_team_seedings (season_id, team_id, division, conference)
select s.id, t.id, v.division, v.conference
from (values
  ('Arcadia Sky', 1, 'A'), ('Leftovers', 1, 'A'), ('Ronrons', 1, 'A'), ('Rozando la Katástrofe', 1, 'A'),
  ('Clarity', 1, 'B'), ('Lycoris', 1, 'B'), ('Nferno Scarlet', 1, 'B'), ('Rozando la Katástrofe Castores', 1, 'B'),
  ('Battle Alliance', 2, 'A'), ('Crazy Dave Racing', 2, 'A'), ('Jet Joker', 2, 'A'), ('Rozando la Katástrofe Lobos', 2, 'A'),
  ('brilliant', 2, 'B'), ('Helios', 2, 'B'), ('Leaf Bloom', 2, 'B'), ('Starstruck', 2, 'B'),
  ('Dynamite', 3, 'A'), ('Jet Joker Merekes', 3, 'A'), ('Stellar Roses', 3, 'A'), ('Urumyans♪', 3, 'A'),
  ('Dandelion', 3, 'B'), ('Grass Valley, CA', 3, 'B'), ('Nebulosa', 3, 'B'), ('Solar Storm', 3, 'B'),
  ('Excalibur', 4, 'A'), ('Jackpot', 4, 'A'), ('rebirth', 4, 'A'), ('Velocity', 4, 'A'),
  ('Astroblitz', 4, 'B'), ('Cool Kids', 4, 'B'), ('Dedalo', 4, 'B'), ('Yoshi Family Island', 4, 'B'),
  ('Nferno Violet', 5, 'A'), ('Race in the Space', 5, 'A'), ('Starstruck 2', 5, 'A'), ('World Friend', 5, 'A'),
  ('Code Genius', 5, 'B'), ('Rozando la Katastrofe Kuñau', 5, 'B'), ('The Squirrel Squad', 5, 'B'), ('Unbelievably Bailed', 5, 'B'),
  ('Kartvengers Team Alpha', 6, 'A'), ('Ronrons 2', 6, 'A'), ('Shellstars', 6, 'A'), ('TEPS', 6, 'A'),
  ('Arcadia Terra', 6, 'B'), ('BAFI', 6, 'B'), ('Caliburn', 6, 'B'), ('Pixel Racers', 6, 'B'),
  ('Aquasterne', 7, 'A'), ('OnlyFriends', 7, 'A'), ('Liberty', 7, 'A'), ('Starstruck 3', 7, 'A'),
  ('Acceleration', 7, 'B'), ('Archon Accelerators', 7, 'B'), ('Blackjack', 7, 'B'), ('Rozando la Katástrofe Exodus', 7, 'B'),
  ('3QI', 8, 'A'), ('Champi-Brothers', 8, 'A'), ('Red Shell Syndicate', 8, 'A'), ('Segundones Team', 8, 'A'),
  ('Midnight Wasps', 8, 'B'), ('STAKATAKA', 8, 'B'), ('Tempest', 8, 'B'), ('Versatile Pearl', 8, 'B'),
  ('KartsRapaces Bleues', 9, 'A'), ('King of Caos', 9, 'A'), ('Shy Guys Gambling Club', 9, 'A'), ('Yoshi Family Safari', 9, 'A'),
  ('Cocktail Madeleine', 9, 'B'), ('Garfield Kart', 9, 'B'), ('Solarblitz', 9, 'B'), ('Trial Chambers Diamant', 9, 'B'),
  ('Arcanum', 10, 'A'), ('Nferno Teal', 10, 'A'), ('Prime 6', 10, 'A'), ('Yoshi Ganq', 10, 'A'),
  ('Cyneria Esport', 10, 'B'), ('Koopa Troopers', 10, 'B'), ('Nebulosa del Cangrejo', 10, 'B'), ('Rozando la Katástrofe Unicorns', 10, 'B'),
  ('Harmonia', 11, 'A'), ('KARTNIVOROS', 11, 'A'), ('Race in the Stars', 11, 'A'), ('The Acorn Academy', 11, 'A'),
  ('Hellmoon', 11, 'B'), ('La Hoop', 11, 'B'), ('Rozando la Katástrofe Amborgesa', 11, 'B'), ('Wii Elite Clan', 11, 'B'),
  ('Capybara Skies', 12, 'A'), ('Diamond Justice', 12, 'A'), ('Freshly Squeezed', 12, 'A'), ('Pixel Academy', 12, 'A'),
  ('Autovía del Mediterráneo', 12, 'B'), ('Dry Shell', 12, 'B'), ('Ignition', 12, 'B'), ('Starstruck 4', 12, 'B'),
  ('Deidades', 13, 'A'), ('Domingueros Origen', 13, 'A'), ('Jet Joker Neo', 13, 'A'), ('Volt Switch', 13, 'A'),
  ('Delta Drifters', 13, 'B'), ('Knights Of Wheels', 13, 'B'), ('Rozando la Katástrofe Lotus', 13, 'B'), ('Trial Chambers Perle', 13, 'B'),
  ('Afterparty', 14, 'A'), ('DK Lexus', 14, 'A'), ('KartsRapaces Rouge', 14, 'A'), ('Nakama Clan', 14, 'A'),
  ('IW', 14, 'B'), ('Kartvengers Team', 14, 'B'), ('Pirate Hackers', 14, 'B'), ('Pixel Raiders', 14, 'B'),
  ('Aftermath (again)', 15, 'A'), ('Real Calabacín', 15, 'A'), ('Rozando la Katástrofe Eclipse', 15, 'A'),
  ('Silent Lightning', 15, 'A'), ('Space Dementia', 15, 'A'), ('Team Luxembourg', 15, 'A')
) as v(name, division, conference)
join public.teams t on lower(t.name) = lower(v.name)
cross join (select id from public.seasons where id = '00000000-0000-4000-8000-000000000003'::uuid) s
on conflict (season_id, team_id) do update
set division = excluded.division, conference = excluded.conference;
