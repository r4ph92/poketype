'use server';

import { redirect } from 'next/navigation';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { redirectToPlacedRoom } from './race-placement';

export async function findRace(): Promise<void> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  await redirectToPlacedRoom(guest.id);
}
