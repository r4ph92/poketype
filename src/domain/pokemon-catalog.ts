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

export type EvolutionNode = { dex: PokedexDex; evolutions: EvolutionNode[] };

const evolutionsByDex = new Map<number, PokedexDex[]>();
for (const entry of pokedex) {
  if (entry.evolvesFrom !== null) evolutionsByDex.set(entry.evolvesFrom, [...(evolutionsByDex.get(entry.evolvesFrom) ?? []), entry.dex]);
}

// A species' whole family as a tree from its first form, so a later-generation pre-evolution (Pichu #172) comes before
// Pikachu #25 and each branch (Eevee's eight evolutions) hangs under the form it evolves from, in Pokédex order.
export function evolutionTreeOf(dex: PokedexDex): EvolutionNode {
  return evolutionNodeOf(baseFormOf(dex));
}

export function isLinearEvolution(node: EvolutionNode): boolean {
  return node.evolutions.length <= 1 && node.evolutions.every(isLinearEvolution);
}

function evolutionNodeOf(dex: PokedexDex): EvolutionNode {
  return { dex, evolutions: (evolutionsByDex.get(dex) ?? []).map(evolutionNodeOf) };
}

function baseFormOf(dex: PokedexDex): PokedexDex {
  const previous = entriesByDex.get(dex)!.evolvesFrom;
  return previous === null ? dex : baseFormOf(previous);
}
