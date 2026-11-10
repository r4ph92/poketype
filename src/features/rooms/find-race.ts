'use server';

import { redirect } from 'next/navigation';
import { requireStarter } from '@/features/trainer/starter-gate';
import { findCurrentSession } from '@/server/sessions/current-session';
import { redirectToPlacedRoom } from './race-placement';

export async function findRace(): Promise<void> {
  const session = await findCurrentSession();
  if (!session) redirect('/');
  await requireStarter(session.guest.id, { kind: 'find-race' });
  await redirectToPlacedRoom(session.guest.id, session.account !== null);
}
