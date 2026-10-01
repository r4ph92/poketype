import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import type { GuestId } from '@/domain/guest-id';
import { parseRoomId, roomEntryPath, type RoomId } from '@/domain/room-id';
import { acceptsNewMembers, isRoomOpen } from '@/domain/room-phase';
import type { RoomSnapshot } from '@/domain/room-view';
import { database } from '@/server/db/client';
import { announceRoomChange } from '@/server/push/room-publisher';
import { joinRoom } from '@/server/rooms/room-commands';
import { findRoomPhase, findRoomSnapshot } from '@/server/rooms/room-snapshot';
import { findCurrentGuest } from '@/server/sessions/current-guest';

export type RoomEntry = { kind: 'member'; snapshot: RoomSnapshot } | { kind: 'race-started' };

const raceStarted: RoomEntry = { kind: 'race-started' };

// Opening the link is the join intent (H1, provisional); cached so generateMetadata and the page share one join.
export const enterRoom = cache(async (rawRoomId: string): Promise<RoomEntry> => {
  const roomId = parseRoomId(rawRoomId);
  if (!roomId) notFound();
  const guest = await findCurrentGuest();
  if (!guest) return enterWithoutGuest(roomId);
  return enterAsGuest(roomId, guest.id);
});

async function enterWithoutGuest(roomId: RoomId): Promise<RoomEntry> {
  const phase = await findRoomPhase(database, roomId);
  if (!isRoomOpen(phase)) notFound();
  if (acceptsNewMembers(phase)) redirect(roomEntryPath(roomId));
  return raceStarted;
}

async function enterAsGuest(roomId: RoomId, guestId: GuestId): Promise<RoomEntry> {
  const result = await joinRoom(database, roomId, guestId);
  if (result === 'not-found') notFound();
  if (result === 'race-started') return raceStarted;
  if (result === 'joined') announceRoomChange(roomId);
  const found = await findRoomSnapshot(database, roomId, guestId);
  if (found.kind !== 'snapshot') notFound();
  return { kind: 'member', snapshot: found.snapshot };
}
