import { pokedex, type PokedexDex, type PokedexEntry } from '@/assets/pokedex';
import { gameConfig } from '@/config/game';

const { encounters } = gameConfig;

export type RarityTier = keyof typeof encounters.tierWeights;

// A number from 0 (included) to 1 (excluded): the server passes a secure source, tests a fixed sequence.
export type RandomSource = () => number;

export type WildPokemon = { dex: PokedexDex; level: number };

// waiting is the only open status; caught, fled (every throw missed) and let-go close the encounter for good.
export const encounterStatuses = ['waiting', 'caught', 'fled', 'let-go'] as const;

export type EncounterStatus = (typeof encounterStatuses)[number];

type WildEntry = Extract<PokedexEntry, { rarity: RarityTier }>;

const rarityTiers = Object.keys(encounters.tierWeights) as RarityTier[];

// Evolved forms and the five Kanto legendaries have no tier, so they never appear in the wild.
const wildEntries: readonly WildEntry[] = pokedex.filter((entry): entry is WildEntry => (rarityTiers as readonly (string | null)[]).includes(entry.rarity));

export const wildDexes: readonly PokedexDex[] = wildEntries.map((entry) => entry.dex);

const raritiesByDex = new Map<number, RarityTier>(wildEntries.map((entry) => [entry.dex, entry.rarity]));

// An abandoner meets nothing; tied racers share the better place, so every racer tied for third is guaranteed one.
export function earnsEncounter(place: number | null, random: RandomSource): boolean {
  if (place === null) return false;
  if (place <= encounters.guaranteedPlaces) return true;
  return random() < encounters.otherRacerChance;
}

export function drawWildPokemon(random: RandomSource): WildPokemon {
  const tier = drawTier(random());
  const species = wildEntries.filter((entry) => entry.rarity === tier);
  const dex = species[Math.floor(random() * species.length)]!.dex;
  const levels = encounters.maxLevel - encounters.minLevel + 1;
  return { dex, level: encounters.minLevel + Math.floor(random() * levels) };
}

export function rarityOf(dex: PokedexDex): RarityTier | null {
  return raritiesByDex.get(dex) ?? null;
}

export function catchesOnThrow(dex: PokedexDex, random: RandomSource): boolean {
  const tier = rarityOf(dex);
  return tier !== null && random() < encounters.catchRates[tier];
}

function drawTier(roll: number): RarityTier {
  const total = rarityTiers.reduce((sum, tier) => sum + encounters.tierWeights[tier], 0);
  let remaining = roll * total;
  for (const tier of rarityTiers) {
    remaining -= encounters.tierWeights[tier];
    if (remaining < 0) return tier;
  }
  return rarityTiers[rarityTiers.length - 1]!;
}
