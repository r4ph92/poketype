import 'server-only';
import { redirect } from 'next/navigation';
import type { HostRole } from '@/domain/host-role';
import type { GuestId } from '@/domain/guest-id';
import { roomPath } from '@/domain/room-id';
import { switchRoomPath } from '@/domain/room-switch';
import type { RoomVisibility } from '@/domain/room-visibility';
import { database } from '@/server/db/client';
import { inOtherRoom } from '@/server/rooms/active-membership';
import { openRoom } from '@/server/rooms/room-commands';
import { interfaceTextLanguage } from './interface-text-language';

// Not a Server Action: the host always comes from the caller's session, never from the request.
export async function redirectToNewRoom(hostGuestId: GuestId, { visibility, hostRole }: { visibility: RoomVisibility; hostRole: HostRole }): Promise<never> {
  const roomId = await openRoom(database, { hostGuestId, visibility, hostRole, openedAt: new Date(), textLanguage: await interfaceTextLanguage() });
  if (roomId === inOtherRoom) redirect(switchRoomPath({ kind: 'create-room', visibility, hostRole }));
  redirect(roomPath(roomId));
}
