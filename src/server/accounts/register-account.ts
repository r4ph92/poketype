import type { Database } from '../db/types';
import { findSessionRecord } from '../sessions/session-record';
import { openAccount } from './account-commands';
import { hashPassword, PasswordHashingBusyError } from './password-hash';
import { isUsernameTaken } from './username-availability';

export type RegisterAccountResult =
  | { outcome: 'opened'; sessionToken: string }
  | { outcome: 'usernameTaken' }
  | { outcome: 'busy' }
  | { outcome: 'alreadyAccount' };

export type RegistrationRequest = { username: string; password: string; replacedSessionToken: string | undefined };

export async function registerAccount(database: Database, request: RegistrationRequest): Promise<RegisterAccountResult> {
  if ((await findSessionRecord(database, request.replacedSessionToken))?.guestHasAccount) return { outcome: 'alreadyAccount' };
  if (await isUsernameTaken(database, request.username)) return { outcome: 'usernameTaken' };
  const passwordHash = await hashUnlessBusy(request.password);
  if (!passwordHash) return { outcome: 'busy' };
  return openAccount(database, { username: request.username, passwordHash }, request.replacedSessionToken);
}

async function hashUnlessBusy(password: string): Promise<string | null> {
  try {
    return await hashPassword(password);
  } catch (error) {
    if (error instanceof PasswordHashingBusyError) return null;
    throw error;
  }
}
