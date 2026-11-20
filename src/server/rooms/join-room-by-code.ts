import { normalizeRoomCode } from '@/domain/room-code';
import type { RoomId } from '@/domain/room-id';
import type { Database } from '../db/types';
import type { InOtherRoom } from './active-membership';
import { findRoomByCodeThrottled, type CodeGuesser, type CodeLookup } from './room-code-throttle';
import { joinRoom, type JoinResult } from './room-commands';

export type JoinByCodeRequest = CodeGuesser & { typedCode: string; joinedAt: Date };

export type CodeLookupRequest = Omit<JoinByCodeRequest, 'joinedAt'>;

export type CodeJoinRefusal = 'unknown' | 'private' | 'banned' | 'race-started' | 'full' | 'throttled';

// in-other-room carries the room so the offer to leave the current one (SALLE-06) can lead there.
export type CodeJoin = { outcome: 'joined' | 'already-member' | InOtherRoom; roomId: RoomId } | { outcome: CodeJoinRefusal };

// A private room's code names a real room, so the refusal says an invitation is needed; it is not a wrong guess and the throttle does not count it.
export const refusalOf: Record<Exclude<JoinResult, 'joined' | 'already-member' | InOtherRoom>, CodeJoinRefusal> = {
  'not-found': 'unknown',
  private: 'private',
  banned: 'banned',
  'race-started': 'race-started',
  full: 'full',
};

export async function joinRoomByCode(database: Database, { typedCode, guestId, addressKey, joinedAt }: JoinByCodeRequest): Promise<CodeJoin> {
  const lookup = await findRoomForCode(database, { typedCode, guestId, addressKey });
  if (lookup.outcome !== 'found') return lookup;
  const result = await joinRoom(database, { roomId: lookup.roomId, guestId, joinedAt });
  if (result === 'joined' || result === 'already-member' || result === 'in-other-room') return { outcome: result, roomId: lookup.roomId };
  return { outcome: refusalOf[result] };
}

// A malformed code cannot name any room, so it is refused without a lookup and is not counted by the throttle.
export async function findRoomForCode(database: Database, { typedCode, guestId, addressKey }: CodeLookupRequest): Promise<CodeLookup> {
  const code = normalizeRoomCode(typedCode);
  if (!code) return { outcome: 'unknown' };
  return findRoomByCodeThrottled(database, { guestId, addressKey }, code);
}
