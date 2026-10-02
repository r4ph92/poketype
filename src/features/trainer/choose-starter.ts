'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { GuestId } from '@/domain/guest-id';
import { parseStarterDestination, pathOf, type StarterDestination } from '@/domain/starter-destination';
import { parseStarterDex } from '@/domain/starter';
import { redirectToNewRoom } from '@/features/rooms/new-room';
import { redirectToPlacedRoom } from '@/features/rooms/race-placement';
import { database } from '@/server/db/client';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { chooseStarter } from '@/server/trainer/collection-commands';
import type { ChooseStarterState } from './choose-starter-state';

// A repeated submission keeps the first starter and still carries on, so a double click never strands the player.
export async function chooseStarterAction(previous: ChooseStarterState, formData: FormData): Promise<ChooseStarterState> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const dex = parseStarterDex(formData.get('starter'));
  if (dex === null) return { invalid: true, attempt: previous.attempt + 1 };
  await chooseStarter(database, guest.id, dex);
  revalidatePath('/play', 'layout');
  return continueTo(parseStarterDestination(formData.get('next')), guest.id);
}

async function continueTo(destination: StarterDestination, guestId: GuestId): Promise<never> {
  if (destination.kind === 'find-race') return redirectToPlacedRoom(guestId);
  if (destination.kind === 'create-room') return redirectToNewRoom(guestId, destination.visibility);
  redirect(pathOf(destination));
}
