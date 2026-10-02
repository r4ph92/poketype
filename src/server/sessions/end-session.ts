import 'server-only';
import { database } from '../db/client';
import { clearSessionCookie, readSessionCookie } from './session-cookie';
import { deleteSession } from './session-store';

// The row is deleted, not expired, so a copy of the old cookie can never be replayed.
export async function endSession(): Promise<void> {
  await deleteSession(database, await readSessionCookie());
  await clearSessionCookie();
}
