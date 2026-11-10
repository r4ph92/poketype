'use server';

import { redirect } from 'next/navigation';
import type { z } from 'zod';
import type { GuestId } from '@/domain/guest-id';
import { parseRoomId } from '@/domain/room-id';
import { hubDestination, pathOf, type StarterDestination } from '@/domain/starter-destination';
import { validateTrainerName } from '@/domain/trainer-name';
import { redirectToPlacedRoom } from '@/features/rooms/race-placement';
import { requireStarter } from '@/features/trainer/starter-gate';
import { database } from '@/server/db/client';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { guestEntryFormSchema } from '@/server/validation/account-form-schemas';
import { parseForm } from '@/server/validation/parse-form';
import { writeSessionCookie } from '@/server/sessions/session-cookie';
import { createGuestSession } from '@/server/sessions/session-store';
import { findRaceIntent } from './entry-destination';
import type { GuestEntryState } from './guest-entry-state';

type GuestEntryForm = z.output<typeof guestEntryFormSchema>;

export async function enterAsGuest(previous: GuestEntryState, formData: FormData): Promise<GuestEntryState> {
  const form = parseForm(formData, guestEntryFormSchema);
  if (!form) return { error: 'required', submittedName: '', attempt: previous.attempt + 1 };
  const current = await findCurrentGuest();
  if (current) return continueAs(current.id, form);
  const result = validateTrainerName(form.trainerName);
  if (!result.ok) return { error: result.error, submittedName: form.trainerName, attempt: previous.attempt + 1 };
  const session = await createGuestSession(database, result.name);
  await writeSessionCookie(session.token);
  return continueAs(session.guestId, form);
}

// "Faire une course" places the new trainer at once; the plain submit goes to the invited room or the trainer hub.
// A trainer without a starter picks it first, then carries on to the same place.
async function continueAs(guestId: GuestId, form: GuestEntryForm): Promise<never> {
  const destination = entryDestination(form);
  await requireStarter(guestId, destination);
  if (destination.kind === 'find-race') await redirectToPlacedRoom(guestId);
  redirect(pathOf(destination));
}

function entryDestination(form: GuestEntryForm): StarterDestination {
  if (form.intent === findRaceIntent) return { kind: 'find-race' };
  const roomId = parseRoomId(form.returnRoomId);
  return roomId ? { kind: 'room', roomId } : hubDestination;
}
