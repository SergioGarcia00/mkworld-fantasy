export type Seeding = { division: number; conference: 'A' | 'B' };

// Official Atlas League Season 3 seedings. Names match the database.
const groups: Record<string, string[]> = {
  '1A': ['Arcadia Sky', 'Leftovers', 'Ronrons', 'Rozando la Katástrofe'],
  '1B': ['Clarity', 'Lycoris', 'Nferno Scarlet', 'Rozando la Katástrofe Castores'],
  '2A': ['Battle Alliance', 'Crazy Dave Racing', 'Jet Joker', 'Rozando la Katástrofe Lobos'],
  '2B': ['brilliant', 'Helios', 'Leaf Bloom', 'Starstruck'],
  '3A': ['Dynamite', 'Jet Joker Merekes', 'Stellar Roses', 'Urumyans♪'],
  '3B': ['Dandelion', 'Grass Valley, CA', 'Nebulosa', 'Solar Storm'],
  '4A': ['Excalibur', 'Jackpot', 'rebirth', 'Velocity'],
  '4B': ['Astroblitz', 'Cool Kids', 'Dedalo', 'Yoshi Family Island'],
  '5A': ['Nferno Violet', 'Race in the Space', 'Starstruck 2', 'World Friend'],
  '5B': ['Code Genius', 'Rozando la Katastrofe Kuñau', 'The Squirrel Squad', 'Unbelievably Bailed'],
  '6A': ['Kartvengers Team Alpha', 'Ronrons 2', 'Shellstars', 'TEPS'],
  '6B': ['Arcadia Terra', 'BAFI', 'Caliburn', 'Pixel Racers'],
  '7A': ['Aquasterne', 'OnlyFriends', 'Liberty', 'Starstruck 3'],
  '7B': ['Acceleration', 'Archon Accelerators', 'Blackjack', 'Rozando la Katástrofe Exodus'],
  '8A': ['3QI', 'Champi-Brothers', 'Red Shell Syndicate', 'Segundones Team'],
  '8B': ['Midnight Wasps', 'STAKATAKA', 'Tempest', 'Versatile Pearl'],
  '9A': ['KartsRapaces Bleues', 'King of Caos', 'Shy Guys Gambling Club', 'Yoshi Family Safari'],
  '9B': ['Cocktail Madeleine', 'Garfield Kart', 'Solarblitz', 'Trial Chambers Diamant'],
  '10A': ['Arcanum', 'Nferno Teal', 'Prime 6', 'Yoshi Ganq'],
  '10B': ['Cyneria Esport', 'Koopa Troopers', 'Nebulosa del Cangrejo', 'Rozando la Katástrofe Unicorns'],
  '11A': ['Harmonia', 'KARTNIVOROS', 'Race in the Stars', 'The Acorn Academy'],
  '11B': ['Hellmoon', 'La Hoop', 'Rozando la Katástrofe Amborgesa', 'Wii Elite Clan'],
  '12A': ['Capybara Skies', 'Diamond Justice', 'Freshly Squeezed', 'Pixel Academy'],
  '12B': ['Autovía del Mediterráneo', 'Dry Shell', 'Ignition', 'Starstruck 4'],
  '13A': ['Deidades', 'Domingueros Origen', 'Jet Joker Neo', 'Volt Switch'],
  '13B': ['Delta Drifters', 'Knights Of Wheels', 'Rozando la Katástrofe Lotus', 'Trial Chambers Perle'],
  '14A': ['Afterparty', 'DK Lexus', 'KartsRapaces Rouge', 'Nakama Clan'],
  '14B': ['IW', 'Kartvengers Team', 'Pirate Hackers', 'Pixel Raiders'],
  '15A': ['Aftermath (again)', 'Real Calabacín', 'Rozando la Katástrofe Eclipse', 'Silent Lightning', 'Space Dementia', 'Team Luxembourg'],
};

export const season3Seedings = new Map<string, Seeding>(
  Object.entries(groups).flatMap(([key, names]) => {
    const [division, conference] = key.match(/^(\d+)([AB])$/)!.slice(1);
    return names.map((name) => [name, { division: Number(division), conference: conference as 'A' | 'B' }]);
  }),
);

export const seedingFor = (team: string | null | undefined) =>
  team ? (season3Seedings.get(team) ?? null) : null;
