import { eq, sql } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';
import { hashSessionToken, isWellFormedSessionToken } from './session-token';

export type SessionRecord = { guestId: GuestId; guestHasAccount: boolean };

// Beyond the live sessions, a guest session that signup retired moments ago is still found, so a replayed submission is told "already an account".
export async function findSessionRecord(executor: DatabaseExecutor, token: string | undefined): Promise<SessionRecord | null> {
  if (!isWellFormedSessionToken(token)) return null;
  const { expiresAt, userId, guestId } = schema.sessions;
  const replayWindow = sql`make_interval(mins => ${gameConfig.account.replayWindowMinutes})`;
  const [row] = await executor
    .select({
      guestId,
      isLive: sql<boolean>`${expiresAt} > now()`,
      isRecentlyRetired: sql<boolean>`${userId} is null and ${expiresAt} > now() - ${replayWindow}`,
      ownerId: schema.users.id,
    })
    .from(schema.sessions)
    .leftJoin(schema.users, eq(schema.users.guestId, schema.sessions.guestId))
    .where(eq(schema.sessions.tokenHash, hashSessionToken(token)));
  if (!row) return null;
  const guestHasAccount = row.ownerId !== null;
  if (row.isLive || (row.isRecentlyRetired && guestHasAccount)) return { guestId: row.guestId, guestHasAccount };
  return null;
}

export async function lockSessionToken(executor: DatabaseExecutor, token: string | undefined): Promise<void> {
  if (!isWellFormedSessionToken(token)) return;
  await executor.execute(sql`select pg_advisory_xact_lock(hashtext(${hashSessionToken(token)}))`);
}
