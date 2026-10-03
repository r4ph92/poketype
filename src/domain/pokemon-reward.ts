import type { PokedexDex } from '@/assets/pokedex';
import { evolvedFormAt } from './pokemon-evolution';
import { addXp } from './pokemon-level';
import type { RandomSource } from './random-source';

export type PokemonState = { dex: PokedexDex; level: number; xp: number };

// The evolved Pokémon keeps the level and XP it reached; random only decides between evolutions reached at the same level.
export function rewardPokemon(pokemon: PokemonState, xp: number, random: RandomSource): PokemonState {
  const grown = addXp(pokemon, xp);
  return { dex: evolvedFormAt(pokemon.dex, grown.level, random), level: grown.level, xp: grown.xp };
}
