import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import type { GuestId } from '@/domain/guest-id';
import { parseRoomId, roomEntryPath, type RoomId } from '@/domain/room-id';
import { acceptsNewMembers, isRoomOpen } from '@/domain/room-phase';
import { switchRoomPath } from '@/domain/room-switch';
import type { RoomSnapshot } from '@/domain/room-view';
import { database } from '@/server/db/client';
import { announceRoomChange } from '@/server/push/room-publisher';
import { joinRoom } from '@/server/rooms/room-commands';
import { loadRoomSnapshot } from '@/server/rooms/load-room-snapshot';
import { findRoomAccess, isOutsideOfPrivateRoom } from '@/server/rooms/room-access';
import { requireStarter } from '@/features/trainer/starter-gate';
import { findCurrentGuest } from '@/server/sessions/current-guest';

export type RoomEntry = { kind: 'member'; snapshot: RoomSnapshot } | { kind: 'race-started' } | { kind: 'full' } | { kind: 'private' } | { kind: 'banned' };

const raceStarted: RoomEntry = { kind: 'race-started' };
const roomFull: RoomEntry = { kind: 'full' };
const privateRoom: RoomEntry = { kind: 'private' };
const bannedFromRoom: RoomEntry = { kind: 'banned' };

// Opening the link is the join intent (H1, provisional); cached so generateMetadata and the page share one join.
export const enterRoom = cache(async (rawRoomId: string): Promise<RoomEntry> => {
  const roomId = parseRoomId(rawRoomId);
  if (!roomId) notFound();
  const guest = await findCurrentGuest();
  if (!guest) return enterWithoutGuest(roomId);
  return enterAsGuest(roomId, guest.id);
});

async function enterWithoutGuest(roomId: RoomId): Promise<RoomEntry> {
  const access = await findRoomAccess(database, roomId);
  if (!access || !isRoomOpen(access.phase)) notFound();
  if (access.visibility === 'private') return privateRoom;
  if (acceptsNewMembers(access.phase)) redirect(roomEntryPath(roomId));
  return raceStarted;
}

// A private room refuses an outsider before the starter screen, so nobody picks a starter only to be turned away.
async function enterAsGuest(roomId: RoomId, guestId: GuestId): Promise<RoomEntry> {
  if (await isOutsideOfPrivateRoom(database, roomId, guestId)) return privateRoom;
  await requireStarter(guestId, { kind: 'room', roomId });
  const result = await joinRoom(database, { roomId, guestId, joinedAt: new Date() });
  if (result === 'not-found') notFound();
  if (result === 'in-other-room') redirect(switchRoomPath({ kind: 'room', roomId }));
  if (result === 'banned') return bannedFromRoom;
  if (result === 'private') return privateRoom;
  if (result === 'race-started') return raceStarted;
  if (result === 'full') return roomFull;
  if (result === 'joined') announceRoomChange(roomId);
  return memberEntry(roomId, guestId);
}

async function memberEntry(roomId: RoomId, guestId: GuestId): Promise<RoomEntry> {
  const { found, hasChangedRoom } = await loadRoomSnapshot(database, roomId, guestId, new Date());
  if (hasChangedRoom) announceRoomChange(roomId);
  if (found.kind !== 'snapshot') notFound();
  return { kind: 'member', snapshot: found.snapshot };
}
