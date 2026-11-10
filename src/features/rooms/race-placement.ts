import 'server-only';
import { redirect } from 'next/navigation';
import type { GuestId } from '@/domain/guest-id';
import { roomPath } from '@/domain/room-id';
import { database } from '@/server/db/client';
import { announceRoomChange } from '@/server/push/room-publisher';
import { joinAvailablePublicRoom, placeInPublicRoom } from '@/server/rooms/room-placement';
import { interfaceTextLanguage } from './interface-text-language';

export const noRoomAvailablePath = '/play?noRoom=1';

// Not a Server Action: the guest always comes from the caller's session, never from the request.
// Only an account may open a room when none has a seat; anyone else is told that no room is available.
export async function redirectToPlacedRoom(guestId: GuestId, isAccount: boolean): Promise<never> {
  const request = { guestId, placedAt: new Date(), textLanguage: await interfaceTextLanguage() };
  const placement = isAccount ? await placeInPublicRoom(database, request) : await joinAvailablePublicRoom(database, request);
  if (!placement) redirect(noRoomAvailablePath);
  if (placement.result !== 'already-member') announceRoomChange(placement.roomId);
  redirect(roomPath(placement.roomId));
}
