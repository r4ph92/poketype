import type { PokedexDex } from '@/assets/pokedex';
import type { AchievementMetrics } from '@/config/achievements';
import type { BadgeId } from './badges';

// What one Pokémon did as its trainer's racer, from settled races only.
export type PokemonRecord = { races: number; wins: number; bestWpm: number | null };

export type OwnedPokemon = { dex: PokedexDex; level: number; xp: number; isPartner: boolean; record: PokemonRecord };

// averageWpm and accuracy (a 0..1 ratio) average the ranked results; they are null until a race is ranked.
export type TrainerStats = { races: number; wins: number; averageWpm: number | null; accuracy: number | null };

// place is null for a race the trainer abandoned.
export type RecentRace = { raceId: string; place: number | null; grossWpm: number | null };

export type TrainerProfile = {
  collection: OwnedPokemon[];
  stats: TrainerStats;
  recentRaces: RecentRace[];
  badges: BadgeId[];
  achievements: AchievementMetrics;
};

export const noRaceStats: TrainerStats = { races: 0, wins: 0, averageWpm: null, accuracy: null };

export function partnerOf(collection: readonly OwnedPokemon[]): OwnedPokemon | null {
  return collection.find((pokemon) => pokemon.isPartner) ?? null;
}
