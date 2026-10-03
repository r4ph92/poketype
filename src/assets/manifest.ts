import { shopItemIds } from '@/domain/shop-item';
// Local assets only. Gameplay ownership is independent of decorative artwork.
export const artwork = {
  camp: { src: '/assets/scenes/camp.svg', width: 800, height: 460, origin: 'Original PokéType campsite vector artwork', placeholder: false },
  podium: { src: '/assets/scenes/podium.svg', width: 800, height: 360, origin: 'Original PokéType podium vector artwork', placeholder: false },
  route: { src: '/assets/scenes/route.svg', width: 800, height: 440, origin: 'Original vector pixel environment created for PokéType', placeholder: false },
  trainer: { src: '/assets/sprites/trainers/red.png', width: 80, height: 80, origin: 'https://play.pokemonshowdown.com/sprites/trainers/red.png', rightsHolder: 'Nintendo / Game Freak / The Pokémon Company', terms: 'Official game artwork; no asset license granted.', retrieved: '2026-10-01', modification: 'None', placeholder: false },
  guide: { src: '/assets/sprites/trainers/oak.png', width: 80, height: 80, origin: 'https://play.pokemonshowdown.com/sprites/trainers/oak.png', rightsHolder: 'Nintendo / Game Freak / The Pokémon Company', terms: 'Official game artwork; no asset license granted.', retrieved: '2026-10-01', modification: 'None', placeholder: false },
  charmander: { src: '/assets/sprites/pokemon/charmander.png', width: 96, height: 96, origin: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/4.png', rightsHolder: 'Nintendo / Game Freak / The Pokémon Company', terms: 'Third-party game artwork; no asset license granted. Non-commercial educational project notice applies.', retrieved: '2026-10-01', modification: 'None', placeholder: false },
} as const;

// Pokémon sheets and front artwork: per-species source and authors in pokemon-credits.ts (server only), sheet sizes in pokemon.ts.

// Dashboard front/evolution art. Every file retains the 96×96 original pixels.
export const dashboardArtwork = {
  dexNumbers: 'every Pokédex number from 1 to 649',
  sourceTemplate: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/{dex}.png',
  localTemplate: '/assets/sprites/pokemon/front/{dex}.png',
  rightsHolder: 'Nintendo / Game Freak / The Pokémon Company',
  terms: 'Official game artwork; no asset license granted.',
  retrieved: '2026-10-01 (#1-151), 2026-10-02 (#152-649)', modification: 'None',
  badges: { path: '/assets/badges/', origin: 'Original PokéType vector badge icons', names: ['boulder', 'cascade', 'thunder', 'rainbow', 'soul', 'marsh', 'volcano', 'earth'] },
} as const;

// Shop items: original 32×32 pixel icons drawn for PokéType, one file per item id under /assets/items/.
export const itemArtwork = {
  path: '/assets/items/',
  size: 32,
  origin: 'Original PokéType pixel item icons',
  names: shopItemIds,
} as const;
