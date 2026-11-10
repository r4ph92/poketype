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

// addressKey is null when the hosting platform reports no client address (a local server); the guest's own count still applies.
export type CodeGuesser = { guestId: GuestId; addressKey: string | null };

type ThrottleKey = { log: FailureLog; lockNamespace: number; value: string };

// Two-key advisory locks never collide with the one-key locks taken on session tokens, nor with the login throttle's namespace.
const guestLockNamespace = 38;
const addressLockNamespace = 39;

const { codeThrottle } = gameConfig.rooms;

const guestFailureLog: FailureLog = { table: schema.roomCodeFailures, key: schema.roomCodeFailures.guestId, failedAt: schema.roomCodeFailures.failedAt };
const addressFailureLog: FailureLog = {
  table: schema.roomCodeAddressFailures,
  key: schema.roomCodeAddressFailures.addressKey,
  failedAt: schema.roomCodeAddressFailures.failedAt,
};

const unknownCode: CodeLookup = { outcome: 'unknown' };
const throttled: CodeLookup = { outcome: 'throttled' };

// The locks serialize a guest's and an address's attempts, so parallel guesses are counted one by one and none slips past the limit.
// A locked guest or address is refused even with a valid code, and a success never clears the failures: knowing one's own code must not reset the count.
export async function findRoomByCodeThrottled(database: Database, guesser: CodeGuesser, code: RoomCode): Promise<CodeLookup> {
  const keys = throttleKeysOf(guesser);
  return database.transaction(async (transaction) => {
    for (const key of keys) await lockAndPurge(transaction, key);
    if (await isAnyKeyLocked(transaction, keys)) return throttled;
    const roomId = await findOpenRoomId(transaction, code);
    if (roomId) return { outcome: 'found', roomId };
    await recordFailure(transaction, guesser);
    return unknownCode;
  });
}

// Always guest first, then address: every transaction takes the locks in the same order, so two guesses cannot deadlock.
function throttleKeysOf({ guestId, addressKey }: CodeGuesser): ThrottleKey[] {
  const guestKey: ThrottleKey = { log: guestFailureLog, lockNamespace: guestLockNamespace, value: guestId };
  if (!addressKey) return [guestKey];
  return [guestKey, { log: addressFailureLog, lockNamespace: addressLockNamespace, value: addressKey }];
}

async function lockAndPurge(transaction: DatabaseTransaction, key: ThrottleKey): Promise<void> {
  await transaction.execute(sql`select pg_advisory_xact_lock(${key.lockNamespace}, hashtext(${key.value}))`);
  await purgeExpiredFailures(transaction, key.log, key.value, codeThrottle);
}

async function isAnyKeyLocked(transaction: DatabaseTransaction, keys: readonly ThrottleKey[]): Promise<boolean> {
  for (const key of keys) {
    if (isAttemptLocked(await readFailureAges(transaction, key.log, key.value, codeThrottle), codeThrottle)) return true;
  }
  return false;
}

async function recordFailure(transaction: DatabaseTransaction, { guestId, addressKey }: CodeGuesser): Promise<void> {
  await transaction.insert(schema.roomCodeFailures).values({ guestId });
  if (addressKey) await transaction.insert(schema.roomCodeAddressFailures).values({ addressKey });
}

// A closed room keeps its code but answers like an unknown one.
async function findOpenRoomId(transaction: DatabaseTransaction, code: RoomCode): Promise<RoomId | null> {
  const [room] = await transaction
    .select({ id: schema.rooms.id })
    .from(schema.rooms)
    .where(and(eq(schema.rooms.code, code), ne(schema.rooms.phase, 'closed')));
  return room?.id ?? null;
}
