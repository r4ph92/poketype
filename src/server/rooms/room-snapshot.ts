import { isTrainerAvatar } from '@/assets/trainers';
import { and, asc, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { lobbyIdleOf } from '@/domain/lobby-idle';
import type { RoomId } from '@/domain/room-id';
import { holdsRace, isRoomOpen, type RoomPhase } from '@/domain/room-phase';
import type { RacerProgress, RaceView, RoomMemberView, RoomSnapshot } from '@/domain/room-view';
import * as schema from '../db/schema';
import type { Database } from '../db/types';
import { toRaceResults } from './race-results-view';
import { findCurrentRace, findRaceParticipants, finishTimeMs, type CurrentRace, type RaceParticipantRow } from './race-rows';

type RoomMemberRow = Awaited<ReturnType<typeof selectRoomMemberRows>>[number];

type MemberRoles = { hostGuestId: GuestId; viewerGuestId: GuestId };

type RaceContext = { phase: RoomPhase; viewerGuestId: GuestId; memberKeys: ReadonlyMap<GuestId, string> };

type RaceProgress = { race: CurrentRace; participants: Map<GuestId, RaceParticipantRow> };

// closed-idle tells a member their room closed for inactivity; any other closed room answers like an unknown one.
export type RoomSnapshotResult = { kind: 'snapshot'; snapshot: RoomSnapshot } | { kind: 'not-member' } | { kind: 'not-found' } | { kind: 'closed-idle' };

const notFound: RoomSnapshotResult = { kind: 'not-found' };
const notMember: RoomSnapshotResult = { kind: 'not-member' };
const closedIdle: RoomSnapshotResult = { kind: 'closed-idle' };

// Every room has its host as a member, so a room without rows does not exist.
export async function findRoomSnapshot(database: Database, roomId: RoomId, viewerGuestId: GuestId): Promise<RoomSnapshotResult> {
  const rows = await selectRoomMemberRows(database, roomId);
  if (rows.length === 0) return notFound;
  const { phase, revision, hostGuestId, closeReason, lastActivityAt } = rows[0]!;
  const isViewerMember = rows.some((row) => row.memberGuestId === viewerGuestId);
  if (!isRoomOpen(phase)) return isViewerMember && closeReason === 'idle' ? closedIdle : notFound;
  if (!isViewerMember) return notMember;
  const raceProgress = holdsRace(phase) ? await findRaceProgress(database, roomId) : null;
  const members = rows.map((row) => toMemberView(row, { hostGuestId, viewerGuestId }, raceProgress));
  const race = raceProgress ? toRaceView(raceProgress, { phase, viewerGuestId, memberKeys: memberKeysOf(rows) }) : null;
  const lobbyIdle = phase === 'waiting' ? lobbyIdleOf(lastActivityAt) : null;
  return { kind: 'snapshot', snapshot: { roomId, phase, revision, members, race, lobbyIdle } };
}

// The race row commits in the same transaction as the phase change, so a race phase always finds its race.
async function findRaceProgress(database: Database, roomId: RoomId): Promise<RaceProgress | null> {
  const race = await findCurrentRace(database, roomId);
  if (!race) return null;
  const rows = await findRaceParticipants(database, race.id);
  return { race, participants: new Map(rows.map((row) => [row.guestId, row])) };
}

// The phase was read before the race, so a race settling in between shows its results from the next snapshot, matching its phase.
function toRaceView({ race, participants }: RaceProgress, { phase, viewerGuestId, memberKeys }: RaceContext): RaceView {
  const viewer = participants.get(viewerGuestId);
  const viewerProgress = viewer
    ? { lastSequence: viewer.lastSequence, position: viewer.position, keystrokes: viewer.keystrokes, rejectedKeystrokes: viewer.rejectedKeystrokes }
    : null;
  const results = phase === 'results' ? toRaceResults(race, [...participants.values()], memberKeys) : null;
  return { id: race.id, startsAt: race.startsAt.getTime(), deadlineAt: race.deadlineAt.getTime(), passage: race.passage, viewer: viewerProgress, results };
}

function memberKeysOf(rows: readonly RoomMemberRow[]): Map<GuestId, string> {
  return new Map(rows.map((row) => [row.memberGuestId, row.memberKey]));
}

function toMemberView(row: RoomMemberRow, { hostGuestId, viewerGuestId }: MemberRoles, raceProgress: RaceProgress | null): RoomMemberView {
  return {
    memberKey: row.memberKey,
    trainerName: row.trainerName,
    ...(isTrainerAvatar(row.trainerAvatar) ? { trainerAvatar: row.trainerAvatar } : {}),
    hasAccount: row.accountId !== null,
    isHost: row.memberGuestId === hostGuestId,
    isViewer: row.memberGuestId === viewerGuestId,
    progress: raceProgress ? racerProgress(raceProgress, row.memberGuestId) : null,
  };
}

function racerProgress({ race, participants }: RaceProgress, guestId: GuestId): RacerProgress {
  const participant = participants.get(guestId);
  if (!participant) return { position: 0, finishMs: null, abandoned: false };
  return { position: participant.position, finishMs: finishTimeMs(participant.finishedAt, race.startsAt), abandoned: participant.abandonedAt !== null };
}

function selectRoomMemberRows(database: Database, roomId: RoomId) {
  return database
    .select({
      phase: schema.rooms.phase,
      revision: schema.rooms.revision,
      hostGuestId: schema.rooms.hostGuestId,
      closeReason: schema.rooms.closeReason,
      lastActivityAt: schema.rooms.lastActivityAt,
      memberKey: schema.roomMembers.id,
      memberGuestId: schema.roomMembers.guestId,
      trainerName: schema.guests.trainerName,
      trainerAvatar: schema.users.trainerAvatar,
      accountId: schema.users.id,
    })
    .from(schema.rooms)
    .innerJoin(schema.roomMembers, eq(schema.roomMembers.roomId, schema.rooms.id))
    .innerJoin(schema.guests, eq(schema.guests.id, schema.roomMembers.guestId))
    .leftJoin(schema.users, eq(schema.users.guestId, schema.guests.id))
    .where(eq(schema.rooms.id, roomId))
    .orderBy(asc(schema.roomMembers.joinedAt), asc(schema.roomMembers.id));
}

export async function findRoomPhase(database: Database, roomId: RoomId): Promise<RoomPhase | null> {
  const [room] = await database.select({ phase: schema.rooms.phase }).from(schema.rooms).where(eq(schema.rooms.id, roomId));
  return room?.phase ?? null;
}

export async function findRoomRevision(database: Database, roomId: RoomId): Promise<number | null> {
  const [room] = await database.select({ revision: schema.rooms.revision }).from(schema.rooms).where(eq(schema.rooms.id, roomId));
  return room?.revision ?? null;
}

export type Membership = 'member' | 'not-member' | 'not-found';

export async function findMembership(database: Database, roomId: RoomId, guestId: GuestId): Promise<Membership> {
  const [row] = await database
    .select({ phase: schema.rooms.phase, memberId: schema.roomMembers.id })
    .from(schema.rooms)
    .leftJoin(schema.roomMembers, and(eq(schema.roomMembers.roomId, schema.rooms.id), eq(schema.roomMembers.guestId, guestId)))
    .where(eq(schema.rooms.id, roomId));
  if (!row || !isRoomOpen(row.phase)) return 'not-found';
  return row.memberId ? 'member' : 'not-member';
}
