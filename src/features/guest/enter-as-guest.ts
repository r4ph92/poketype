'use server';

import { redirect } from 'next/navigation';
import type { GuestId } from '@/domain/guest-id';
import { parseRoomId } from '@/domain/room-id';
import { validateTrainerName } from '@/domain/trainer-name';
import { redirectToPlacedRoom } from '@/features/rooms/race-placement';
import { database } from '@/server/db/client';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { writeSessionCookie } from '@/server/sessions/session-cookie';
import { createGuestSession } from '@/server/sessions/session-store';
import { destinationAfterEntry, findRaceIntent } from './entry-destination';
import type { GuestEntryState } from './guest-entry-state';

export async function enterAsGuest(previous: GuestEntryState, formData: FormData): Promise<GuestEntryState> {
  const current = await findCurrentGuest();
  if (current) return continueAs(current.id, formData);
  const submitted = formData.get('trainerName');
  const result = validateTrainerName(submitted);
  if (!result.ok) {
    return { error: result.error, submittedName: typeof submitted === 'string' ? submitted : '', attempt: previous.attempt + 1 };
  }
  const session = await createGuestSession(database, result.name);
  await writeSessionCookie(session.token);
  return continueAs(session.guestId, formData);
}

// "Faire une course" places the new trainer at once; the plain submit goes to the invited room or the trainer hub.
async function continueAs(guestId: GuestId, formData: FormData): Promise<never> {
  if (formData.get('intent') === findRaceIntent) await redirectToPlacedRoom(guestId);
  redirect(destinationAfterEntry(parseRoomId(formData.get('returnRoomId'))));
}
