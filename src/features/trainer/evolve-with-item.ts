'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ItemEvolutionResult } from '@/domain/item-evolution';
import { isEvolutionItemId } from '@/domain/shop-item';
import { isCanonicalUuid } from '@/domain/uuid';
import { database } from '@/server/db/client';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { evolveWithItem } from '@/server/trainer/evolve-with-item';

// The server checks the Pokémon is the trainer's, its species and the item in the bag; the form only names the Pokémon and the item.
export async function evolveWithItemAction(submitted: FormData): Promise<ItemEvolutionResult> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const pokemonId = submitted.get('pokemonId');
  const item = submitted.get('item');
  if (!isCanonicalUuid(pokemonId) || !isEvolutionItemId(item)) return { outcome: 'cannot-use' };
  const result = await evolveWithItem(database, { guestId: guest.id, pokemonId, item });
  if (result.outcome === 'evolved') revalidatePath('/play', 'layout');
  return result;
}
