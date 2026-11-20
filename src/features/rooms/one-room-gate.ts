import 'server-only';
import { redirect } from 'next/navigation';
import type { GuestId } from '@/domain/guest-id';
import { leadsToRoom, switchRoomPath } from '@/domain/room-switch';
import type { StarterDestination } from '@/domain/starter-destination';
import { database } from '@/server/db/client';
import { findCurrentRoom } from '@/server/rooms/current-room';

// The actions that pick or open a room ask first, before anything is created; the join commands refuse a second room again under their lock.
export async function requireNoOtherRoom(guestId: GuestId, destination: StarterDestination): Promise<void> {
  const current = await findCurrentRoom(database, guestId, new Date());
  if (current === null || leadsToRoom(destination, current.roomId)) return;
  redirect(switchRoomPath(destination));
}
