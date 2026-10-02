'use server';

import { redirect } from 'next/navigation';
import { roomPath } from '@/domain/room-id';
import { defaultRoomVisibility, isRoomVisibility, type RoomVisibility } from '@/domain/room-visibility';
import { database } from '@/server/db/client';
import { openRoom } from '@/server/rooms/room-commands';
import { findCurrentGuest } from '@/server/sessions/current-guest';

export async function createRoom(submitted: unknown): Promise<void> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const roomId = await openRoom(database, { hostGuestId: guest.id, visibility: submittedVisibility(submitted), openedAt: new Date() });
  redirect(roomPath(roomId));
}

// The quick "Créer une salle" buttons send no choice, and an unknown value is not worth an error: both open the default public room.
function submittedVisibility(submitted: unknown): RoomVisibility {
  const visibility = submitted instanceof FormData ? submitted.get('visibility') : null;
  return isRoomVisibility(visibility) ? visibility : defaultRoomVisibility;
}
