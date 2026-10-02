import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import type { Database } from '../db/types';
import { findPublicRooms } from './public-rooms';
import { joinRoom, openRoom } from './room-commands';

export type Placement = { roomId: RoomId; result: 'joined' | 'already-member' | 'created' };

// The candidate list is read without locks; joinRoom then locks each room and re-counts its members, so a seat taken in between only moves the player on to the next room.
export async function placeInPublicRoom(database: Database, guestId: GuestId): Promise<Placement> {
  const candidates = await findPublicRooms(database, gameConfig.rooms.placementCandidates);
  for (const { roomId } of candidates) {
    const result = await joinRoom(database, roomId, guestId);
    if (result === 'joined' || result === 'already-member') return { roomId, result };
  }
  return { roomId: await openRoom(database, guestId), result: 'created' };
}
