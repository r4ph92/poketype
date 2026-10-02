import { and, eq, ne, sql } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import { isAttemptLocked } from '@/domain/attempt-lock';
import type { GuestId } from '@/domain/guest-id';
import type { RoomCode } from '@/domain/room-code';
import type { RoomId } from '@/domain/room-id';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { purgeExpiredFailures, readFailureAges, type FailureLog } from '../throttle/failure-log';

export type CodeLookup = { outcome: 'found'; roomId: RoomId } | { outcome: 'unknown' } | { outcome: 'throttled' };

// Two-key advisory locks never collide with the one-key locks taken on session tokens, nor with the login throttle's namespace.
const roomCodeThrottleLockNamespace = 38;

const { codeThrottle } = gameConfig.rooms;

const roomCodeFailureLog: FailureLog = { table: schema.roomCodeFailures, key: schema.roomCodeFailures.guestId, failedAt: schema.roomCodeFailures.failedAt };

const unknownCode: CodeLookup = { outcome: 'unknown' };
const throttled: CodeLookup = { outcome: 'throttled' };

// The guest's lock serializes its attempts, so parallel guesses are counted one by one and none slips past the limit.
// A locked guest is refused even with a valid code, and a success never clears the failures: knowing one's own code must not reset the count.
export async function findRoomByCodeThrottled(database: Database, guestId: GuestId, code: RoomCode): Promise<CodeLookup> {
  return database.transaction(async (transaction) => {
    await transaction.execute(sql`select pg_advisory_xact_lock(${roomCodeThrottleLockNamespace}, hashtext(${guestId}))`);
    await purgeExpiredFailures(transaction, roomCodeFailureLog, guestId, codeThrottle);
    if (isAttemptLocked(await readFailureAges(transaction, roomCodeFailureLog, guestId, codeThrottle), codeThrottle)) return throttled;
    const roomId = await findOpenRoomId(transaction, code);
    if (roomId) return { outcome: 'found', roomId };
    await transaction.insert(schema.roomCodeFailures).values({ guestId });
    return unknownCode;
  });
}

// A closed room keeps its code but answers like an unknown one.
async function findOpenRoomId(transaction: DatabaseTransaction, code: RoomCode): Promise<RoomId | null> {
  const [room] = await transaction
    .select({ id: schema.rooms.id })
    .from(schema.rooms)
    .where(and(eq(schema.rooms.code, code), ne(schema.rooms.phase, 'closed')));
  return room?.id ?? null;
}
