'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isCanonicalUuid } from '@/domain/uuid';
import { database } from '@/server/db/client';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { choosePartner } from '@/server/trainer/collection-commands';

// Only a Pokémon the trainer owns can become the partner; anything else changes nothing.
export async function choosePartnerAction(submitted: FormData): Promise<void> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const pokemonId = submitted.get('pokemonId');
  if (!isCanonicalUuid(pokemonId)) return;
  await choosePartner(database, guest.id, pokemonId);
  revalidatePath('/play', 'layout');
}
