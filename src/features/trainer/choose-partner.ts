'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { parsePokedexDex } from '@/domain/pokemon-catalog';
import { database } from '@/server/db/client';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { choosePartner } from '@/server/trainer/collection-commands';

// Only a Pokémon the trainer owns can become the partner; anything else changes nothing.
export async function choosePartnerAction(submitted: FormData): Promise<void> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const dex = parsePokedexDex(submitted.get('dex'));
  if (dex === null) return;
  await choosePartner(database, guest.id, dex);
  revalidatePath('/play', 'layout');
}
