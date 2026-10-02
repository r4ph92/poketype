import type { PokemonSpecies } from '@/assets/pokemon';
import { gameConfig } from '@/config/game';
import { isCount, isJsonObject } from './json-guards';
import { isPokemonSpecies } from './pokemon-catalog';

// The Pokémon that raced, as the settlement found it and as it left it.
export type RewardedPokemon = { species: PokemonSpecies; level: number; xp: number };

// xp is what the race granted, shown even when the level cap kept none of it.
export type XpReward = { xp: number; before: RewardedPokemon; after: RewardedPokemon };

export function hasEvolved({ before, after }: XpReward): boolean {
  return before.species !== after.species;
}

// undefined means malformed, so a snapshot without the field is rejected rather than read as "no reward".
export function parseXpReward(value: unknown): XpReward | null | undefined {
  if (value === null) return null;
  if (!isJsonObject(value) || !isCount(value.xp)) return undefined;
  const before = parseRewardedPokemon(value.before);
  const after = parseRewardedPokemon(value.after);
  if (!before || !after || after.level < before.level) return undefined;
  return { xp: value.xp, before, after };
}

function parseRewardedPokemon(value: unknown): RewardedPokemon | null {
  if (!isJsonObject(value) || !isPokemonSpecies(value.species) || !isLevel(value.level) || !isCount(value.xp)) return null;
  return { species: value.species, level: value.level, xp: value.xp };
}

function isLevel(value: unknown): value is number {
  return isCount(value) && value >= 1 && value <= gameConfig.progression.maxLevel;
}
