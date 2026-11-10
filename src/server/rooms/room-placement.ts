import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import type { TextLanguage } from '@/domain/text-settings';
import type { Database } from '../db/types';
import { findPublicRooms } from './public-rooms';
import { joinRoom, openRoom } from './room-commands';

export type Placement = { roomId: RoomId; result: 'joined' | 'already-member' | 'created' };

// textLanguage only matters when no room has a seat: the new room races in the guest's interface language.
export type PlacementRequest = { guestId: GuestId; placedAt: Date; textLanguage?: TextLanguage };

// The candidate list is read without locks; joinRoom then locks each room and re-counts its members, so a seat taken in between only moves the player on to the next room.
export async function joinAvailablePublicRoom(database: Database, { guestId, placedAt }: PlacementRequest): Promise<Placement | null> {
  const candidates = await findPublicRooms(database, gameConfig.rooms.placementCandidates, placedAt);
  for (const { roomId } of candidates) {
    const result = await joinRoom(database, { roomId, guestId, joinedAt: placedAt });
    if (result === 'joined' || result === 'already-member') return { roomId, result };
  }
  return null;
}

export async function placeInPublicRoom(database: Database, request: PlacementRequest): Promise<Placement> {
  const joined = await joinAvailablePublicRoom(database, request);
  if (joined) return joined;
  const { guestId, placedAt, textLanguage } = request;
  return { roomId: await openRoom(database, { hostGuestId: guestId, visibility: 'public', openedAt: placedAt, textLanguage }), result: 'created' };
}
