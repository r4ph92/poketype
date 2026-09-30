'use server';

import { redirect } from 'next/navigation';
import { parseRoomId } from '@/domain/room-id';
import { validateTrainerName } from '@/domain/trainer-name';
import { database } from '@/server/db/client';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { writeSessionCookie } from '@/server/sessions/session-cookie';
import { createGuestSession } from '@/server/sessions/session-store';
import { destinationAfterEntry } from './entry-destination';
import type { GuestEntryState } from './guest-entry-state';

export async function enterAsGuest(previous: GuestEntryState, formData: FormData): Promise<GuestEntryState> {
  const destination = destinationAfterEntry(parseRoomId(formData.get('returnRoomId')));
  if (await findCurrentGuest()) redirect(destination);
  const submitted = formData.get('trainerName');
  const result = validateTrainerName(submitted);
  if (!result.ok) {
    return { error: result.error, submittedName: typeof submitted === 'string' ? submitted : '', attempt: previous.attempt + 1 };
  }
  await writeSessionCookie(await createGuestSession(database, result.name));
  redirect(destination);
}
