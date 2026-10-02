import { and, eq, gt, isNull, lte, sql } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import { loginUsernameKey } from '@/domain/username';
import * as schema from '../db/schema';
import type { Database } from '../db/types';
import { hashSessionToken, isWellFormedSessionToken } from '../sessions/session-token';
import { insertSession } from '../sessions/session-store';
import { checkPasswordThrottled } from './login-throttle';

export type ReplayedSignUp = { username: string; password: string; replacedSessionToken: string | undefined };

export type ReplayCompletion = { outcome: 'opened'; sessionToken: string } | { outcome: 'busy' } | { outcome: 'refused' };

// A no-JavaScript double click sends two submissions and the browser keeps only the second answer, so the first one's cookie is lost.
// The repeat is completed only when it proves the same credentials moments after the first one created the account.
// The password check goes through the login throttle, so a replay is refused while the username is locked.
export async function completeReplayedSignUp(database: Database, request: ReplayedSignUp): Promise<ReplayCompletion> {
  const account = await findRecentlyCreatedAccount(database, request.replacedSessionToken);
  if (!account || loginUsernameKey(account.username) !== loginUsernameKey(request.username)) return { outcome: 'refused' };
  const check = await checkPasswordThrottled(database, { usernameKey: loginUsernameKey(account.username), password: request.password, storedHash: account.passwordHash });
  if (check === 'busy') return { outcome: 'busy' };
  if (check !== 'verified') return { outcome: 'refused' };
  const lifetimeHours = gameConfig.account.sessionLifetimeHours;
  return { outcome: 'opened', sessionToken: await insertSession(database, { guestId: account.guestId, userId: account.userId, lifetimeHours }) };
}

async function findRecentlyCreatedAccount(database: Database, token: string | undefined) {
  if (!isWellFormedSessionToken(token)) return null;
  const completionWindow = sql`make_interval(secs => ${gameConfig.account.replayCompletionSeconds})`;
  const [row] = await database
    .select({
      guestId: schema.sessions.guestId,
      userId: schema.users.id,
      username: schema.users.username,
      passwordHash: schema.passwordCredentials.passwordHash,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.guestId, schema.sessions.guestId))
    .innerJoin(schema.passwordCredentials, eq(schema.passwordCredentials.userId, schema.users.id))
    .where(
      and(
        eq(schema.sessions.tokenHash, hashSessionToken(token)),
        isNull(schema.sessions.userId),
        lte(schema.sessions.expiresAt, sql`now()`),
        gt(schema.sessions.expiresAt, sql`now() - ${completionWindow}`),
      ),
    );
  return row ?? null;
}
