import 'server-only';
import { cache } from 'react';
import { database } from '../db/client';
import { readSessionCookie } from './session-cookie';
import { findGuestBySessionToken, type Guest } from './session-store';

export const findCurrentGuest = cache(async (): Promise<Guest | null> => {
  return findGuestBySessionToken(database, await readSessionCookie());
});
