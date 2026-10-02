import { eq, sql } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import { isAttemptLocked } from '@/domain/attempt-lock';
import * as schema from '../db/schema';
import type { Database } from '../db/types';
import { purgeExpiredFailures, readFailureAges, type FailureLog } from '../throttle/failure-log';
import { verifyUnlessBusy } from './password-hash';

export type ThrottledPasswordCheck = { usernameKey: string; password: string; storedHash: string };

export type PasswordCheckOutcome = 'verified' | 'wrong' | 'locked' | 'busy';

type LoginReservation = { outcome: 'reserved'; failureId: string } | { outcome: 'locked' };

// Two-key advisory locks never collide with the one-key locks taken on session tokens.
const loginThrottleLockNamespace = 47;

const { loginThrottle } = gameConfig.account;

const loginFailureLog: FailureLog = { table: schema.loginFailures, key: schema.loginFailures.usernameKey, failedAt: schema.loginFailures.failedAt };

// The attempt is counted as a failure before the password is checked, so parallel guesses cannot all be verified before the first one is recorded.
export async function checkPasswordThrottled(database: Database, check: ThrottledPasswordCheck): Promise<PasswordCheckOutcome> {
  const reservation = await reserveLoginAttempt(database, check.usernameKey);
  if (reservation.outcome === 'locked') return 'locked';
  const verified = await verifyUnlessBusy(check.password, check.storedHash);
  if (verified === 'busy') {
    await releaseLoginAttempt(database, reservation.failureId);
    return 'busy';
  }
  if (!verified) return 'wrong';
  await clearLoginFailures(database, check.usernameKey);
  return 'verified';
}

async function reserveLoginAttempt(database: Database, usernameKey: string): Promise<LoginReservation> {
  return database.transaction(async (transaction) => {
    await transaction.execute(sql`select pg_advisory_xact_lock(${loginThrottleLockNamespace}, hashtext(${usernameKey}))`);
    await purgeExpiredFailures(transaction, loginFailureLog, usernameKey, loginThrottle);
    if (isAttemptLocked(await readFailureAges(transaction, loginFailureLog, usernameKey, loginThrottle), loginThrottle)) return { outcome: 'locked' };
    const [failure] = await transaction.insert(schema.loginFailures).values({ usernameKey }).returning({ id: schema.loginFailures.id });
    return { outcome: 'reserved', failureId: failure!.id };
  });
}

async function releaseLoginAttempt(database: Database, failureId: string): Promise<void> {
  await database.delete(schema.loginFailures).where(eq(schema.loginFailures.id, failureId));
}

async function clearLoginFailures(database: Database, usernameKey: string): Promise<void> {
  await database.delete(schema.loginFailures).where(eq(schema.loginFailures.usernameKey, usernameKey));
}
