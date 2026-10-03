import { pokedex, type PokedexDex, type PokedexEntry } from '@/assets/pokedex';
import type { PokemonSpecies } from '@/assets/pokemon';

const entriesByDex = new Map<number, PokedexEntry>(pokedex.map((entry) => [entry.dex, entry]));

export const firstDex = pokedex[0].dex;
export const lastDex = pokedex[pokedex.length - 1]!.dex;

export function isPokedexDex(value: unknown): value is PokedexDex {
  return typeof value === 'number' && entriesByDex.has(value);
}

export function parsePokedexDex(submitted: FormDataEntryValue | null): PokedexDex | null {
  if (typeof submitted !== 'string' || !/^[1-9]\d{0,2}$/.test(submitted)) return null;
  const dex = Number(submitted);
  return isPokedexDex(dex) ? dex : null;
}

export function speciesOfDex(dex: PokedexDex): PokemonSpecies {
  return entriesByDex.get(dex)!.species;
}

// Every form of a species' family in Pokédex order, from its base form through each branch (Eevee lists all three evolutions).
export function evolutionLineOf(dex: PokedexDex): PokedexDex[] {
  const base = baseFormOf(dex);
  return pokedex.filter((entry) => baseFormOf(entry.dex) === base).map((entry) => entry.dex);
}

function baseFormOf(dex: PokedexDex): PokedexDex {
  const previous = entriesByDex.get(dex)!.evolvesFrom;
  return previous === null ? dex : baseFormOf(previous);
}
