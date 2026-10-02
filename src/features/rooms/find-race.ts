'use server';

import { redirect } from 'next/navigation';
import { requireStarter } from '@/features/trainer/starter-gate';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { redirectToPlacedRoom } from './race-placement';

export async function findRace(): Promise<void> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  await requireStarter(guest.id, { kind: 'find-race' });
  await redirectToPlacedRoom(guest.id);
}
