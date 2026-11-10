'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { GuestId } from '@/domain/guest-id';
import { parseStarterDestination, pathOf, type StarterDestination } from '@/domain/starter-destination';
import { parseStarterDex } from '@/domain/starter';
import { redirectToNewRoom } from '@/features/rooms/new-room';
import { redirectToPlacedRoom } from '@/features/rooms/race-placement';
import { database } from '@/server/db/client';
import { parseForm } from '@/server/validation/parse-form';
import { starterFormSchema } from '@/server/validation/trainer-form-schemas';
import { findCurrentSession } from '@/server/sessions/current-session';
import { requireHostingAccount } from '@/features/rooms/hosting-gate';
import { chooseStarter } from '@/server/trainer/collection-commands';
import type { ChooseStarterState } from './choose-starter-state';

// A repeated submission keeps the first starter and still carries on, so a double click never strands the player.
export async function chooseStarterAction(previous: ChooseStarterState, formData: FormData): Promise<ChooseStarterState> {
  const session = await findCurrentSession();
  if (!session) redirect('/');
  const form = parseForm(formData, starterFormSchema);
  const dex = parseStarterDex(form?.starter ?? null);
  if (!form || dex === null) return { invalid: true, attempt: previous.attempt + 1 };
  await chooseStarter(database, session.guest.id, dex);
  revalidatePath('/play', 'layout');
  return continueTo(parseStarterDestination(form.next), session.guest.id, session.account !== null);
}

async function continueTo(destination: StarterDestination, guestId: GuestId, isAccount: boolean): Promise<never> {
  if (destination.kind === 'find-race') return redirectToPlacedRoom(guestId, isAccount);
  if (destination.kind === 'create-room') {
    await requireHostingAccount();
    return redirectToNewRoom(guestId, destination.visibility);
  }
  redirect(pathOf(destination));
}
