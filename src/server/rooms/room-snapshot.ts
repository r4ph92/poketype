import { asc, eq } from 'drizzle-orm';
import { isRoomOpen, type RoomPhase } from '@/domain/room-phase';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import type { RoomMemberView, RoomSnapshot } from '@/domain/room-view';
import * as schema from '../db/schema';
import type { Database } from '../db/types';

type RoomMemberRow = Awaited<ReturnType<typeof selectRoomMemberRows>>[number];

export type RoomSnapshotResult = { kind: 'snapshot'; snapshot: RoomSnapshot } | { kind: 'not-member' } | { kind: 'not-found' };

const notFound: RoomSnapshotResult = { kind: 'not-found' };
const notMember: RoomSnapshotResult = { kind: 'not-member' };

// Every room has its host as a member, so a room without rows does not exist.
export async function findRoomSnapshot(database: Database, roomId: RoomId, viewerGuestId: GuestId): Promise<RoomSnapshotResult> {
  const rows = await selectRoomMemberRows(database, roomId);
  if (rows.length === 0) return notFound;
  const { phase, revision, hostGuestId } = rows[0]!;
  if (!isRoomOpen(phase)) return notFound;
  if (!rows.some((row) => row.memberGuestId === viewerGuestId)) return notMember;
  const members = rows.map((row) => toMemberView(row, hostGuestId, viewerGuestId));
  return { kind: 'snapshot', snapshot: { roomId, phase, revision, members } };
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
