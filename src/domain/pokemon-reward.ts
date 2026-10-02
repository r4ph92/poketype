import type { PokedexDex } from '@/assets/pokedex';
import { evolvedFormAt } from './pokemon-evolution';
import { addXp } from './pokemon-level';

export type PokemonState = { dex: PokedexDex; level: number; xp: number };

// The evolved Pokémon keeps the level and XP it reached.
export function rewardPokemon(pokemon: PokemonState, xp: number, ownedDexes: ReadonlySet<number>): PokemonState {
  const grown = addXp(pokemon, xp);
  return { dex: evolvedFormAt(pokemon.dex, grown.level, ownedDexes), level: grown.level, xp: grown.xp };
}
