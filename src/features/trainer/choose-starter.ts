'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { parseStarterDestination } from '@/domain/starter-destination';
import { parseStarterDex } from '@/domain/starter';
import { continueTo } from '@/features/rooms/continue-to-destination';
import { database } from '@/server/db/client';
import { parseForm } from '@/server/validation/parse-form';
import { starterFormSchema } from '@/server/validation/trainer-form-schemas';
import { findCurrentSession } from '@/server/sessions/current-session';
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
  return continueTo(parseStarterDestination(form.next), session.guest.id);
}
