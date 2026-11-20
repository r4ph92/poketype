import 'server-only';
import { redirect } from 'next/navigation';
import type { GuestId } from '@/domain/guest-id';
import { roomPath } from '@/domain/room-id';
import { database } from '@/server/db/client';
import { announceRoomChange } from '@/server/push/room-publisher';
import { joinAvailablePublicRoom } from '@/server/rooms/room-placement';

export const noRoomAvailablePath = '/play?noRoom=1';

// Not a Server Action: the guest always comes from the caller's session, never from the request.
// With no room to join nothing is created: the hub says so and lets an account open a room itself.
export async function redirectToPlacedRoom(guestId: GuestId): Promise<never> {
  const placement = await joinAvailablePublicRoom(database, { guestId, placedAt: new Date() });
  if (!placement) redirect(noRoomAvailablePath);
  if (placement.result !== 'already-member') announceRoomChange(placement.roomId);
  redirect(roomPath(placement.roomId));
}
