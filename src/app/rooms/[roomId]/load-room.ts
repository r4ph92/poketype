import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { isWellFormedRoomId } from '@/domain/room-id';
import { database } from '@/server/db/client';
import { findRoomSnapshot, roomExists, type RoomSnapshot } from '@/server/rooms/room-snapshot';
import { findCurrentGuest } from '@/server/sessions/current-guest';

export const loadRoomOrLeave = cache(async (roomId: string): Promise<RoomSnapshot> => {
  if (!isWellFormedRoomId(roomId)) notFound();
  const guest = await findCurrentGuest();
  if (!guest) return leaveAsGuestlessVisitor(roomId);
  const snapshot = await findRoomSnapshot(database, roomId, guest.id);
  if (!snapshot) notFound();
  return snapshot;
});

async function leaveAsGuestlessVisitor(roomId: string): Promise<never> {
  if (!(await roomExists(database, roomId))) notFound();
  redirect('/');
}
