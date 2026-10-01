import { and, desc, eq, lt, sql } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import { isLoginLocked } from '@/domain/login-lock';
import * as schema from '../db/schema';
import type { Database, DatabaseExecutor } from '../db/types';
import { verifyUnlessBusy } from './password-hash';

export type ThrottledPasswordCheck = { usernameKey: string; password: string; storedHash: string };

export type PasswordCheckOutcome = 'verified' | 'wrong' | 'locked' | 'busy';

type LoginReservation = { outcome: 'reserved'; failureId: string } | { outcome: 'locked' };

// Two-key advisory locks never collide with the one-key locks taken on session tokens.
const loginThrottleLockNamespace = 47;

const { maxFailures, windowMinutes, lockMinutes } = gameConfig.account.loginThrottle;

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
    await purgeExpiredFailures(transaction, usernameKey);
    if (isLoginLocked(await readFailureAges(transaction, usernameKey))) return { outcome: 'locked' };
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

async function purgeExpiredFailures(executor: DatabaseExecutor, usernameKey: string): Promise<void> {
  const relevantPeriod = sql`now() - make_interval(mins => ${windowMinutes + lockMinutes})`;
  await executor.delete(schema.loginFailures).where(and(eq(schema.loginFailures.usernameKey, usernameKey), lt(schema.loginFailures.failedAt, relevantPeriod)));
}

async function readFailureAges(executor: DatabaseExecutor, usernameKey: string): Promise<number[]> {
  const rows = await executor
    .select({ ageSeconds: sql<number>`extract(epoch from now() - ${schema.loginFailures.failedAt})::float8` })
    .from(schema.loginFailures)
    .where(eq(schema.loginFailures.usernameKey, usernameKey))
    .orderBy(desc(schema.loginFailures.failedAt))
    .limit(maxFailures);
  return rows.map((row) => Number(row.ageSeconds));
}
