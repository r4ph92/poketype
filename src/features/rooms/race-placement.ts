import 'server-only';
import { redirect } from 'next/navigation';
import type { GuestId } from '@/domain/guest-id';
import { roomPath, type RoomId } from '@/domain/room-id';
import { switchRoomPath } from '@/domain/room-switch';
import { database } from '@/server/db/client';
import { announceRoomChange } from '@/server/push/room-publisher';
import { joinAvailablePublicRoom } from '@/server/rooms/room-placement';

export const noRoomAvailablePath = '/play?noRoom=1';

// Not a Server Action: the guest always comes from the caller's session, never from the request.
// With no room to join nothing is created: the hub says so and lets an account open a room itself.
// skippedRoomId is the room the player just left to race elsewhere, so the search never sends them straight back.
export async function redirectToPlacedRoom(guestId: GuestId, skippedRoomId: RoomId | null = null): Promise<never> {
  const placement = await joinAvailablePublicRoom(database, { guestId, placedAt: new Date(), skippedRoomId });
  if (!placement) redirect(noRoomAvailablePath);
  if (placement.result === 'in-other-room') redirect(switchRoomPath({ kind: 'find-race' }));
  if (placement.result === 'joined') announceRoomChange(placement.roomId);
  redirect(roomPath(placement.roomId));
}
