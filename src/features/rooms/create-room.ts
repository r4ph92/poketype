'use server';

import { redirect } from 'next/navigation';
import { database } from '@/server/db/client';
import { openRoom } from '@/server/rooms/room-commands';
import { findCurrentGuest } from '@/server/sessions/current-guest';

export async function createRoom(): Promise<void> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const roomId = await openRoom(database, guest.id);
  redirect(`/rooms/${roomId}`);
}
