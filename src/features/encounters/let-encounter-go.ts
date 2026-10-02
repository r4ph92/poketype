'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isCanonicalUuid } from '@/domain/uuid';
import { database } from '@/server/db/client';
import { letEncounterGo, type LetGoResult } from '@/server/encounters/let-encounter-go';
import { findCurrentGuest } from '@/server/sessions/current-guest';

export async function letEncounterGoAction(submitted: FormData): Promise<LetGoResult> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const encounterId = submitted.get('encounterId');
  if (!isCanonicalUuid(encounterId)) return 'gone';
  const result = await letEncounterGo(database, guest.id, encounterId);
  revalidatePath('/play', 'layout');
  return result;
}
