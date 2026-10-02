import type { GuestId } from '@/domain/guest-id';
import { normalizeRoomCode } from '@/domain/room-code';
import type { RoomId } from '@/domain/room-id';
import type { Database } from '../db/types';
import { findRoomByCodeThrottled } from './room-code-throttle';
import { joinRoom, type JoinResult } from './room-commands';

export type JoinByCodeRequest = { typedCode: string; guestId: GuestId; joinedAt: Date };

export type CodeJoinRefusal = 'unknown' | 'race-started' | 'full' | 'throttled';

export type CodeJoin = { outcome: 'joined' | 'already-member'; roomId: RoomId } | { outcome: CodeJoinRefusal };

const refusalOf: Record<Exclude<JoinResult, 'joined' | 'already-member'>, CodeJoinRefusal> = { 'not-found': 'unknown', 'race-started': 'race-started', full: 'full' };

// A malformed code cannot name any room, so it is refused without a lookup and is not counted by the throttle.
export async function joinRoomByCode(database: Database, { typedCode, guestId, joinedAt }: JoinByCodeRequest): Promise<CodeJoin> {
  const code = normalizeRoomCode(typedCode);
  if (!code) return { outcome: 'unknown' };
  const lookup = await findRoomByCodeThrottled(database, guestId, code);
  if (lookup.outcome !== 'found') return lookup;
  const result = await joinRoom(database, { roomId: lookup.roomId, guestId, joinedAt });
  if (result === 'joined' || result === 'already-member') return { outcome: result, roomId: lookup.roomId };
  return { outcome: refusalOf[result] };
}
