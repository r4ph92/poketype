'use server';

import { redirect } from 'next/navigation';
import { defaultRoomVisibility, isRoomVisibility } from '@/domain/room-visibility';
import { requireStarter } from '@/features/trainer/starter-gate';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { parseForm } from '@/server/validation/parse-form';
import { createRoomFormSchema } from '@/server/validation/room-schemas';
import { redirectToNewRoom } from './new-room';

// The quick "Créer une salle" buttons send no choice, and an unknown value is not worth an error: both open the default public room.
export async function createRoom(submitted: unknown): Promise<void> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const form: { visibility?: string } | null = submitted instanceof FormData ? parseForm(submitted, createRoomFormSchema) : {};
  if (!form) return;
  const visibility = isRoomVisibility(form.visibility) ? form.visibility : defaultRoomVisibility;
  await requireStarter(guest.id, { kind: 'create-room', visibility });
  await redirectToNewRoom(guest.id, visibility);
}
