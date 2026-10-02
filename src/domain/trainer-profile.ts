import type { PokedexDex } from '@/assets/pokedex';
import type { AchievementMetrics } from '@/config/achievements';
import type { BadgeId } from './badges';
import type { BagItem } from './shop-item';

// What one Pokémon did as its trainer's racer, from settled races only.
export type PokemonRecord = { races: number; wins: number; bestWpm: number | null };

// id names this one Pokémon: a collection can hold several of a species.
export type OwnedPokemon = { id: string; dex: PokedexDex; level: number; xp: number; isPartner: boolean; record: PokemonRecord };

// A wild Pokémon in the trainer's queue, still waiting for a throw or to be let go.
export type WaitingEncounter = { id: string; dex: PokedexDex; level: number; throwsUsed: number };

// A legendary the trainer earned: isWaiting while a full PC keeps it out of the collection.
export type LegendaryStatus = { dex: PokedexDex; isWaiting: boolean };

// averageWpm and accuracy (a 0..1 ratio) average the ranked results; they are null until a race is ranked.
export type TrainerStats = { races: number; wins: number; averageWpm: number | null; accuracy: number | null };

// place is null for a race the trainer abandoned; xp is null for a race that granted none (before XP existed, or without a Pokémon).
export type RecentRace = { raceId: string; place: number | null; grossWpm: number | null; xp: number | null };

// caughtDexes is the Pokédex: every species owned now, plus every form a Pokémon evolved from or released. coins is the Poké Dollar balance.
// encounters is the queue of wild Pokémon still waiting, oldest first; legendaries are the legendaries earned so far.
export type TrainerProfile = {
  collection: OwnedPokemon[];
  coins: number;
  bag: BagItem[];
  pcBoxes: number;
  encounters: WaitingEncounter[];
  legendaries: LegendaryStatus[];
  caughtDexes: PokedexDex[];
  stats: TrainerStats;
  recentRaces: RecentRace[];
  badges: BadgeId[];
  achievements: AchievementMetrics;
};

export const noRaceStats: TrainerStats = { races: 0, wins: 0, averageWpm: null, accuracy: null };

export function partnerOf(collection: readonly OwnedPokemon[]): OwnedPokemon | null {
  return collection.find((pokemon) => pokemon.isPartner) ?? null;
}
