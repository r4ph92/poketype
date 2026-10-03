import { pokedex, pokedexRegions, type PokedexEntry, type PokedexRegion } from '@/assets/pokedex';
import { legendaryRewards } from '@/config/achievements';
import { gameConfig } from '@/config/game';

export type PokedexFilter = 'all' | 'owned' | 'evolutions' | 'legendary';

export type UnlockHint = 'legendaryUnlock' | 'wildLegendaryUnlock' | 'evolutionUnlock' | 'starterUnlock' | 'encounterUnlock';

export const pokedexFilters: readonly PokedexFilter[] = ['all', 'owned', 'evolutions', 'legendary'];

const badgeLegendaries = new Set<number>(legendaryRewards.map((reward) => reward.dex));
const starters: readonly number[] = gameConfig.progression.starterDexes;

export function entriesOfRegion(region: PokedexRegion): PokedexEntry[] {
  const { firstDex, lastDex } = pokedexRegions.find((range) => range.id === region)!;
  return pokedex.filter((entry) => entry.dex >= firstDex && entry.dex <= lastDex);
}

export function isLegendary(pokemon: PokedexEntry): boolean {
  return badgeLegendaries.has(pokemon.dex) || pokemon.rarity === 'legendary';
}

export function matchesFilter(pokemon: PokedexEntry, filter: PokedexFilter, caught: ReadonlySet<number>): boolean {
  if (filter === 'owned') return caught.has(pokemon.dex);
  if (filter === 'evolutions') return pokemon.evolvesFrom !== null;
  if (filter === 'legendary') return isLegendary(pokemon);
  return true;
}

// Kanto's legendaries are badge rewards; the later ones are very rare wild encounters; a baby's evolution also meets trainers in the wild.
export function unlockHintOf(pokemon: PokedexEntry): UnlockHint {
  if (badgeLegendaries.has(pokemon.dex)) return 'legendaryUnlock';
  if (pokemon.rarity === 'legendary') return 'wildLegendaryUnlock';
  if (pokemon.rarity === null) return 'evolutionUnlock';
  return starters.includes(pokemon.dex) ? 'starterUnlock' : 'encounterUnlock';
}
