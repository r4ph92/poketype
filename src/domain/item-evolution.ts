import { itemEvolutions } from '@/assets/item-evolutions';
import type { PokedexDex } from '@/assets/pokedex';
import type { EvolutionItemId } from './shop-item';

// cannot-use covers a species the item does nothing to and a Pokémon the trainer does not own.
export type ItemEvolutionResult = { outcome: 'evolved'; from: PokedexDex; into: PokedexDex } | { outcome: 'no-item' | 'cannot-use' };

// One stone or evolution item a species reacts to and the form it becomes; Eevee has three, Poliwhirl and Clamperl two.
export type ItemOption = { item: EvolutionItemId; into: PokedexDex };

export function itemOptionsFor(dex: PokedexDex): ItemOption[] {
  return itemEvolutions.filter((evolution) => evolution.from === dex).map(({ item, into }) => ({ item, into }));
}

export function itemEvolutionOf(dex: PokedexDex, item: EvolutionItemId): PokedexDex | null {
  return itemOptionsFor(dex).find((option) => option.item === item)?.into ?? null;
}
