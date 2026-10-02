'use server';

import { redirect } from 'next/navigation';
import { defaultRoomVisibility, isRoomVisibility, type RoomVisibility } from '@/domain/room-visibility';
import { requireStarter } from '@/features/trainer/starter-gate';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { redirectToNewRoom } from './new-room';

export async function createRoom(submitted: unknown): Promise<void> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const visibility = submittedVisibility(submitted);
  await requireStarter(guest.id, { kind: 'create-room', visibility });
  await redirectToNewRoom(guest.id, visibility);
}

// The quick "Créer une salle" buttons send no choice, and an unknown value is not worth an error: both open the default public room.
function submittedVisibility(submitted: unknown): RoomVisibility {
  const visibility = submitted instanceof FormData ? submitted.get('visibility') : null;
  return isRoomVisibility(visibility) ? visibility : defaultRoomVisibility;
}
