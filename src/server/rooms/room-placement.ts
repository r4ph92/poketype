import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import type { Database } from '../db/types';
import type { InOtherRoom } from './active-membership';
import { findPublicRooms } from './public-rooms';
import { joinRoom } from './room-commands';

export type Placement = { roomId: RoomId; result: 'joined' | 'already-member' | InOtherRoom };

export type PlacementRequest = { guestId: GuestId; placedAt: Date; skippedRoomId?: RoomId };

// The candidate list is read without locks; joinRoom then locks each room and re-counts its members, so a seat taken in between only moves the player on to the next room.
// Being in another room stops the search: no other candidate would take the player either.
export async function joinAvailablePublicRoom(database: Database, { guestId, placedAt, skippedRoomId }: PlacementRequest): Promise<Placement | null> {
  const candidates = await findPublicRooms(database, gameConfig.rooms.placementCandidates, placedAt);
  for (const { roomId } of candidates.filter((candidate) => candidate.roomId !== skippedRoomId)) {
    const result = await joinRoom(database, { roomId, guestId, joinedAt: placedAt });
    if (result === 'joined' || result === 'already-member' || result === 'in-other-room') return { roomId, result };
  }
  return null;
}
