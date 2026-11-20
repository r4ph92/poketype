'use server';

import { redirect } from 'next/navigation';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import { leadsToRoom } from '@/domain/room-switch';
import { parseStarterDestination, type StarterDestination } from '@/domain/starter-destination';
import { database } from '@/server/db/client';
import { announceRoomChange } from '@/server/push/room-publisher';
import { findActiveRoomId } from '@/server/rooms/active-membership';
import { leaveRoom } from '@/server/rooms/leave-room';
import { findCurrentSession } from '@/server/sessions/current-session';
import { parseForm } from '@/server/validation/parse-form';
import { switchRoomFormSchema } from '@/server/validation/room-schemas';
import { continueTo } from '../continue-to-destination';
import { redirectToPlacedRoom } from '../race-placement';

// "Quitter et rejoindre": the ordinary leave (host succession, race abandon), then the destination's own route checks it again from scratch.
export async function switchRoom(submitted: unknown): Promise<void> {
  const session = await findCurrentSession();
  if (!session) redirect('/');
  const form = submitted instanceof FormData ? parseForm(submitted, switchRoomFormSchema) : null;
  const destination = parseStarterDestination(form?.next);
  const leftRoomId = await leaveCurrentRoom(session.guest.id, destination);
  if (destination.kind === 'find-race') return redirectToPlacedRoom(session.guest.id, leftRoomId);
  return continueTo(destination, session.guest.id);
}

async function leaveCurrentRoom(guestId: GuestId, destination: StarterDestination): Promise<RoomId | null> {
  const roomId = await findActiveRoomId(database, guestId);
  if (roomId === null || leadsToRoom(destination, roomId)) return null;
  const result = await leaveRoom(database, { roomId, guestId, leftAt: new Date() });
  if (result === 'left' || result === 'closed') announceRoomChange(roomId);
  return roomId;
}
