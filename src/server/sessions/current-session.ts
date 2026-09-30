import 'server-only';
import { cache } from 'react';
import { database } from '../db/client';
import { readSessionCookie } from './session-cookie';
import { findSessionIdentity, type SessionIdentity } from './session-store';

export const findCurrentSession = cache(async (): Promise<SessionIdentity | null> => {
  return findSessionIdentity(database, await readSessionCookie());
});
