import { asc, eq } from 'drizzle-orm';
import type { RoomPhase } from '@/domain/room-phase';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import * as schema from '../db/schema';
import type { Database } from '../db/types';

export type RoomMemberView = { memberKey: string; trainerName: string; isHost: boolean; isViewer: boolean };

export type RoomSnapshot = { roomId: RoomId; phase: RoomPhase; revision: number; members: RoomMemberView[] };

type RoomMemberRow = Awaited<ReturnType<typeof selectRoomMemberRows>>[number];

export async function findRoomSnapshot(database: Database, roomId: RoomId, viewerGuestId: GuestId): Promise<RoomSnapshot | null> {
  const rows = await selectRoomMemberRows(database, roomId);
  if (!rows.some((row) => row.memberGuestId === viewerGuestId)) return null;
  const { phase, revision, hostGuestId } = rows[0]!;
  if (phase === 'closed') return null;
  const members = rows.map((row) => toMemberView(row, hostGuestId, viewerGuestId));
  return { roomId, phase, revision, members };
}

function selectRoomMemberRows(database: Database, roomId: RoomId) {
  return database
    .select({
      phase: schema.rooms.phase,
      revision: schema.rooms.revision,
      hostGuestId: schema.rooms.hostGuestId,
      memberKey: schema.roomMembers.id,
      memberGuestId: schema.roomMembers.guestId,
      trainerName: schema.guests.trainerName,
    })
    .from(schema.rooms)
    .innerJoin(schema.roomMembers, eq(schema.roomMembers.roomId, schema.rooms.id))
    .innerJoin(schema.guests, eq(schema.guests.id, schema.roomMembers.guestId))
    .where(eq(schema.rooms.id, roomId))
    .orderBy(asc(schema.roomMembers.joinedAt), asc(schema.roomMembers.id));
}

function toMemberView(row: RoomMemberRow, hostGuestId: GuestId, viewerGuestId: GuestId): RoomMemberView {
  return {
    memberKey: row.memberKey,
    trainerName: row.trainerName,
    isHost: row.memberGuestId === hostGuestId,
    isViewer: row.memberGuestId === viewerGuestId,
  };
}

export async function findRoomPhase(database: Database, roomId: RoomId): Promise<RoomPhase | null> {
  const [room] = await database.select({ phase: schema.rooms.phase }).from(schema.rooms).where(eq(schema.rooms.id, roomId));
  return room?.phase ?? null;
}
