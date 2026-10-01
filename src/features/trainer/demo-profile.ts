// UI-only fixture. Replace this object with a trainer view model when the backend is ready.
// Selection in the dashboard stays local; it never changes multiplayer identity or rewards.
export type { PokedexDex as PokemonDex } from '@/assets/pokedex';
import type { PokedexDex as PokemonDex } from '@/assets/pokedex';
export type PokemonType = 'fire' | 'water' | 'grass' | 'electric' | 'normal' | 'bug' | 'poison' | 'rock';
export type EvolutionForm = { dex: PokemonDex; level: number | null };
export type DemoPokemon = { dex: PokemonDex; type: PokemonType; level: number; xp: number; nextLevelXp: number; races: number; wins: number; bestWpm: number; evolution: readonly EvolutionForm[] };

export const demoProfile = {
  equippedDex: 4,
  stats: { races: 84, wins: 18, averageWpm: 62, accuracy: 97 },
  recentRaces: [
    { id: 'one', route: 'forest', place: 2, wpm: 64, xp: 90 },
    { id: 'two', route: 'coast', place: 1, wpm: 71, xp: 110 },
    { id: 'three', route: 'forest', place: 3, wpm: 59, xp: 80 },
  ],
  badges: [
    { id: 'boulder', earned: true }, { id: 'cascade', earned: true },
    { id: 'thunder', earned: true }, { id: 'rainbow', earned: true },
    { id: 'soul', earned: false }, { id: 'marsh', earned: false },
  ],
  collection: [
    { dex: 4, type: 'fire', level: 14, xp: 420, nextLevelXp: 600, races: 26, wins: 7, bestWpm: 74, evolution: [{ dex: 4, level: null }, { dex: 5, level: 16 }, { dex: 6, level: 36 }] },
    { dex: 7, type: 'water', level: 12, xp: 260, nextLevelXp: 500, races: 14, wins: 3, bestWpm: 69, evolution: [{ dex: 7, level: null }, { dex: 8, level: 16 }, { dex: 9, level: 36 }] },
    { dex: 1, type: 'grass', level: 10, xp: 180, nextLevelXp: 400, races: 12, wins: 2, bestWpm: 65, evolution: [{ dex: 1, level: null }, { dex: 2, level: 16 }, { dex: 3, level: 32 }] },
    { dex: 25, type: 'electric', level: 11, xp: 240, nextLevelXp: 450, races: 9, wins: 2, bestWpm: 71, evolution: [{ dex: 25, level: null }, { dex: 26, level: 22 }] },
    { dex: 133, type: 'normal', level: 13, xp: 320, nextLevelXp: 550, races: 8, wins: 1, bestWpm: 67, evolution: [{ dex: 133, level: null }, { dex: 134, level: 25 }] },
    { dex: 10, type: 'bug', level: 8, xp: 140, nextLevelXp: 320, races: 6, wins: 0, bestWpm: 58, evolution: [{ dex: 10, level: null }, { dex: 11, level: 10 }, { dex: 12, level: 16 }] },
    { dex: 16, type: 'normal', level: 9, xp: 190, nextLevelXp: 360, races: 7, wins: 1, bestWpm: 61, evolution: [{ dex: 16, level: null }, { dex: 17, level: 18 }, { dex: 18, level: 36 }] },
    { dex: 43, type: 'grass', level: 11, xp: 200, nextLevelXp: 450, races: 5, wins: 0, bestWpm: 60, evolution: [{ dex: 43, level: null }, { dex: 44, level: 21 }, { dex: 45, level: 32 }] },
    { dex: 39, type: 'normal', level: 10, xp: 300, nextLevelXp: 400, races: 4, wins: 0, bestWpm: 62, evolution: [{ dex: 39, level: null }, { dex: 40, level: 22 }] },
    { dex: 41, type: 'poison', level: 9, xp: 120, nextLevelXp: 360, races: 3, wins: 0, bestWpm: 57, evolution: [{ dex: 41, level: null }, { dex: 42, level: 22 }] },
    { dex: 74, type: 'rock', level: 12, xp: 280, nextLevelXp: 500, races: 5, wins: 1, bestWpm: 63, evolution: [{ dex: 74, level: null }, { dex: 75, level: 25 }, { dex: 76, level: 40 }] },
    { dex: 54, type: 'water', level: 11, xp: 160, nextLevelXp: 450, races: 5, wins: 1, bestWpm: 64, evolution: [{ dex: 54, level: null }, { dex: 55, level: 33 }] },
  ] satisfies DemoPokemon[],
} as const;
