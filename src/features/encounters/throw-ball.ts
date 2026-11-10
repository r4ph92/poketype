'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { parseThrowNumber, type ThrowResult } from '@/domain/encounter-throw';
import { isCanonicalUuid } from '@/domain/uuid';
import { database } from '@/server/db/client';
import { throwBallFormSchema } from '@/server/validation/encounter-form-schemas';
import { parseForm } from '@/server/validation/parse-form';
import { throwBall } from '@/server/encounters/throw-ball';
import { findCurrentGuest } from '@/server/sessions/current-guest';

// The form names the encounter and the throw it means; the server spends the ball and rolls the catch.
export async function throwBallAction(submitted: FormData): Promise<ThrowResult> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const form = parseForm(submitted, throwBallFormSchema);
  const throwNumber = parseThrowNumber(form?.throwNumber);
  if (!form || !isCanonicalUuid(form.encounterId) || throwNumber === null) return { outcome: 'gone' };
  const result = await throwBall(database, { guestId: guest.id, encounterId: form.encounterId, throwNumber });
  revalidatePath('/play', 'layout');
  return result;
}
