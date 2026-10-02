import { and, desc, eq, lt, sql } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { AttemptThrottleRules } from '@/domain/attempt-lock';
import type { DatabaseExecutor } from '../db/types';

// A table of failed attempts: one row per failure, keyed by who failed, read on the database clock.
export type FailureLog = { table: PgTable; key: PgColumn; failedAt: PgColumn };

export async function purgeExpiredFailures(executor: DatabaseExecutor, log: FailureLog, key: string, rules: AttemptThrottleRules): Promise<void> {
  const relevantPeriod = sql`now() - make_interval(mins => ${rules.windowMinutes + rules.lockMinutes})`;
  await executor.delete(log.table).where(and(eq(log.key, key), lt(log.failedAt, relevantPeriod)));
}

export async function readFailureAges(executor: DatabaseExecutor, log: FailureLog, key: string, rules: AttemptThrottleRules): Promise<number[]> {
  const rows = await executor
    .select({ ageSeconds: sql<number>`extract(epoch from now() - ${log.failedAt})::float8` })
    .from(log.table)
    .where(eq(log.key, key))
    .orderBy(desc(log.failedAt))
    .limit(rules.maxFailures);
  return rows.map((row) => Number(row.ageSeconds));
}
