'use server';

import { redirect } from 'next/navigation';
import { database } from '@/server/db/client';
import { clearSessionCookie, readSessionCookie } from '@/server/sessions/session-cookie';
import { deleteSession } from '@/server/sessions/session-store';

export async function leaveAsGuest(): Promise<void> {
  await deleteSession(database, await readSessionCookie());
  await clearSessionCookie();
  redirect('/');
}
