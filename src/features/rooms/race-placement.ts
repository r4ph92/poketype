import 'server-only';
import { redirect } from 'next/navigation';
import type { GuestId } from '@/domain/guest-id';
import { roomPath } from '@/domain/room-id';
import { database } from '@/server/db/client';
import { announceRoomChange } from '@/server/push/room-publisher';
import { placeInPublicRoom } from '@/server/rooms/room-placement';

// Not a Server Action: the guest always comes from the caller's session, never from the request.
export async function redirectToPlacedRoom(guestId: GuestId): Promise<never> {
  const { roomId, result } = await placeInPublicRoom(database, guestId);
  if (result !== 'already-member') announceRoomChange(roomId);
  redirect(roomPath(roomId));
}
