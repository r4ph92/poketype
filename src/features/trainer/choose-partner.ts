'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isCanonicalUuid } from '@/domain/uuid';
import { database } from '@/server/db/client';
import { parseForm } from '@/server/validation/parse-form';
import { partnerFormSchema } from '@/server/validation/trainer-form-schemas';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { choosePartner } from '@/server/trainer/collection-commands';

// Only a Pokémon the trainer owns can become the partner; anything else changes nothing.
export async function choosePartnerAction(submitted: FormData): Promise<void> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const form = parseForm(submitted, partnerFormSchema);
  if (!form || !isCanonicalUuid(form.pokemonId)) return;
  await choosePartner(database, guest.id, form.pokemonId);
  revalidatePath('/play', 'layout');
}
