import type { PokedexDex } from '@/assets/pokedex';
import { stoneEvolutions } from '@/assets/stone-evolutions';
import type { EvolutionStoneId } from './shop-item';

// cannot-use covers a species the stone does nothing to and a Pokémon the trainer does not own.
export type StoneResult = { outcome: 'evolved'; from: PokedexDex; into: PokedexDex } | { outcome: 'no-stone' | 'cannot-use' };

// One stone a species reacts to and the form it becomes; Eevee has three.
export type StoneOption = { stone: EvolutionStoneId; into: PokedexDex };

export function stoneOptionsFor(dex: PokedexDex): StoneOption[] {
  return stoneEvolutions.filter((evolution) => evolution.from === dex).map(({ stone, into }) => ({ stone, into }));
}

export function stoneEvolutionOf(dex: PokedexDex, stone: EvolutionStoneId): PokedexDex | null {
  return stoneOptionsFor(dex).find((option) => option.stone === stone)?.into ?? null;
}
