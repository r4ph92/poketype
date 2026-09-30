import { gameConfig } from '@/config/game';
import type { Database } from '../db/types';
import { insertSession } from '../sessions/session-store';
import { openAccount } from './account-commands';
import { hashPassword, PasswordHashingBusyError, verifyPassword } from './password-hash';
import { findAccountCredentialOfSession, findSessionRecord } from './session-record';
import { isUsernameTaken } from './username-availability';

export type RegisterAccountResult =
  | { outcome: 'opened'; sessionToken: string }
  | { outcome: 'usernameTaken' }
  | { outcome: 'busy' }
  | { outcome: 'alreadyAccount' };

export type RegistrationRequest = { username: string; password: string; replacedSessionToken: string | undefined };

export async function registerAccount(database: Database, request: RegistrationRequest): Promise<RegisterAccountResult> {
  const result = await createAccount(database, request);
  if (result.outcome !== 'alreadyAccount') return result;
  return resumeOwnAccount(database, request);
}

async function createAccount(database: Database, request: RegistrationRequest): Promise<RegisterAccountResult> {
  if ((await findSessionRecord(database, request.replacedSessionToken))?.guestHasAccount) return { outcome: 'alreadyAccount' };
  if (await isUsernameTaken(database, request.username)) return { outcome: 'usernameTaken' };
  const passwordHash = await hashUnlessBusy(request.password);
  if (!passwordHash) return { outcome: 'busy' };
  return openAccount(database, { username: request.username, passwordHash }, request.replacedSessionToken);
}

// A browser that cancelled the first submission never received its cookie; the repeat proves the same credentials, so it gets a session.
async function resumeOwnAccount(database: Database, request: RegistrationRequest): Promise<RegisterAccountResult> {
  const credential = await findAccountCredentialOfSession(database, request.replacedSessionToken);
  if (!credential || credential.username.toLowerCase() !== request.username.toLowerCase()) return { outcome: 'alreadyAccount' };
  if (!(await verifyUnlessBusy(request.password, credential.passwordHash))) return { outcome: 'alreadyAccount' };
  const sessionToken = await insertSession(database, { guestId: credential.guestId, userId: credential.userId, lifetimeHours: gameConfig.account.sessionLifetimeHours });
  return { outcome: 'opened', sessionToken };
}

async function hashUnlessBusy(password: string): Promise<string | null> {
  try {
    return await hashPassword(password);
  } catch (error) {
    if (error instanceof PasswordHashingBusyError) return null;
    throw error;
  }
}

async function verifyUnlessBusy(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await verifyPassword(password, passwordHash);
  } catch (error) {
    if (error instanceof PasswordHashingBusyError) return false;
    throw error;
  }
}
