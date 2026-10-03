import 'server-only';
import { redirect } from 'next/navigation';
import type { GuestId } from '@/domain/guest-id';
import { roomPath } from '@/domain/room-id';
import type { RoomVisibility } from '@/domain/room-visibility';
import { database } from '@/server/db/client';
import { openRoom } from '@/server/rooms/room-commands';
import { interfaceTextLanguage } from './interface-text-language';

// Not a Server Action: the host always comes from the caller's session, never from the request.
export async function redirectToNewRoom(hostGuestId: GuestId, visibility: RoomVisibility): Promise<never> {
  const roomId = await openRoom(database, { hostGuestId, visibility, openedAt: new Date(), textLanguage: await interfaceTextLanguage() });
  redirect(roomPath(roomId));
}
