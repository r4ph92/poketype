'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { parseThrowNumber, type ThrowResult } from '@/domain/encounter-throw';
import { isCanonicalUuid } from '@/domain/uuid';
import { database } from '@/server/db/client';
import { throwBall } from '@/server/encounters/throw-ball';
import { findCurrentGuest } from '@/server/sessions/current-guest';

// The form names the encounter and the throw it means; the server spends the ball and rolls the catch.
export async function throwBallAction(submitted: FormData): Promise<ThrowResult> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const encounterId = submitted.get('encounterId');
  const throwNumber = parseThrowNumber(submitted.get('throwNumber'));
  if (!isCanonicalUuid(encounterId) || throwNumber === null) return { outcome: 'gone' };
  const result = await throwBall(database, { guestId: guest.id, encounterId, throwNumber });
  revalidatePath('/play', 'layout');
  return result;
}
