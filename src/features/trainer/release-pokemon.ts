'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isCanonicalUuid } from '@/domain/uuid';
import { database } from '@/server/db/client';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { releasePokemon } from '@/server/trainer/release-pokemon';

// The server refuses the partner, a legendary without its explicit confirmation, and any Pokémon that is not the trainer's; false keeps the dialog open with its error.
export async function releasePokemonAction(pokemonId: string, isLegendaryConfirmed = false): Promise<boolean> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  if (!isCanonicalUuid(pokemonId)) return false;
  if ((await releasePokemon(database, { guestId: guest.id, pokemonId, isLegendaryConfirmed })) !== 'released') return false;
  revalidatePath('/play', 'layout');
  return true;
}
