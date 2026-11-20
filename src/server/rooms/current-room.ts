import { eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import { isRaceRunning, type RoomPhase } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database } from '../db/types';
import { findActiveRoomId } from './active-membership';
import { closeIdleRoom } from './idle-room';
import { findCurrentParticipant } from './race-rows';

// The room a guest would have to leave before joining another: whose it is, and whether leaving it now abandons a race.
export type CurrentRoom = { roomId: RoomId; hostName: string; isHost: boolean; isRacing: boolean };

type RoomHost = { phase: RoomPhase; hostGuestId: GuestId; hostName: string };

// A lobby left idle past its close time still holds its members until some request notices; this read is one, so it never offers to leave a dead room.
export async function findCurrentRoom(database: Database, guestId: GuestId, now: Date): Promise<CurrentRoom | null> {
  const roomId = await findActiveRoomId(database, guestId);
  if (roomId === null || (await closeIdleRoom(database, roomId, now))) return null;
  const room = await findRoomHost(database, roomId);
  if (!room) return null;
  return { roomId, hostName: room.hostName, isHost: room.hostGuestId === guestId, isRacing: await isStillRacing(database, room.phase, roomId, guestId) };
}

async function findRoomHost(database: Database, roomId: RoomId): Promise<RoomHost | null> {
  const [room] = await database
    .select({ phase: schema.rooms.phase, hostGuestId: schema.rooms.hostGuestId, hostName: schema.guests.trainerName })
    .from(schema.rooms)
    .innerJoin(schema.guests, eq(schema.guests.id, schema.rooms.hostGuestId))
    .where(eq(schema.rooms.id, roomId));
  return room ?? null;
}

// A finisher or an abandoner gives nothing up by leaving, and a spectating host has no race row at all.
async function isStillRacing(database: Database, phase: RoomPhase, roomId: RoomId, guestId: GuestId): Promise<boolean> {
  if (!isRaceRunning(phase)) return false;
  const participant = await findCurrentParticipant(database, roomId, guestId);
  return participant !== null && participant.finishedAt === null && participant.abandonedAt === null;
}
