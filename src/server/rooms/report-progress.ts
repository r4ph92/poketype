import { and, eq, sql } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import { passageLength } from '@/domain/passage';
import { judgeProgressReport, type ParticipantProgress, type ProgressReport } from '@/domain/progress-report';
import { acceptsTypingAt, isPastDeadline } from '@/domain/race';
import type { RoomId } from '@/domain/room-id';
import { isRaceRunning, isRoomOpen, type RoomPhase } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { findCurrentParticipant, findCurrentRace, toParticipantProgress, type CurrentRace, type ParticipantRow } from './race-rows';
import { bumpRevision, isMember, lockRoom } from './room-rows';
import { settleAtDeadline } from './race-deadline';
import { abandonIfGone } from './race-presence';
import { settleWhenAllFinished } from './settle-race';

export type ReportProgressRequest = { roomId: RoomId; guestId: GuestId; report: ProgressReport; reportedAt: Date };

export type ReportProgressResult =
  | 'accepted'
  | 'not-found'
  | 'not-member'
  | 'not-participant'
  | 'not-started'
  | 'race-over'
  | 'finished'
  | 'abandoned'
  | 'inactive'
  | 'stale'
  | 'too-soon'
  | 'implausible';

export type ReportProgressOutcome = { result: ReportProgressResult; participant: ParticipantProgress | null };

type JudgedReport = { row: ParticipantRow; race: CurrentRace; request: ReportProgressRequest };

// Duplicates and floods are refused from an unlocked read, so they never queue on the room lock that every room command shares.
export async function reportProgress(database: Database, request: ReportProgressRequest): Promise<ReportProgressOutcome> {
  const quickRefusal = await refuseWithoutLock(database, request);
  if (quickRefusal) return quickRefusal;
  return database.transaction((transaction) => judgeUnderLock(transaction, request));
}

async function refuseWithoutLock(database: Database, request: ReportProgressRequest): Promise<ReportProgressOutcome | null> {
  const row = await findCurrentParticipant(database, request.roomId, request.guestId);
  if (!row) return null;
  const result = quickRefusalFor(row, request);
  return result ? withProgress(result, row) : null;
}

function quickRefusalFor(row: ParticipantRow, { report, reportedAt }: ReportProgressRequest): ReportProgressResult | null {
  const stopped = stoppedResultOf(row);
  if (stopped) return stopped;
  if (report.sequence <= row.lastSequence) return 'stale';
  if (row.lastReportedAt && reportedAt.getTime() - row.lastReportedAt.getTime() < gameConfig.race.progressBatchMs / 2) return 'too-soon';
  return null;
}

function stoppedResultOf(row: ParticipantRow): ReportProgressResult | null {
  if (row.finishedAt) return 'finished';
  if (row.abandonedAt) return 'abandoned';
  return row.inactiveAt ? 'inactive' : null;
}

async function judgeUnderLock(transaction: DatabaseTransaction, request: ReportProgressRequest): Promise<ReportProgressOutcome> {
  const { roomId, guestId, reportedAt } = request;
  const room = await lockRoom(transaction, roomId);
  if (!room || !isRoomOpen(room.phase)) return refused('not-found');
  if (!(await isMember(transaction, roomId, guestId))) return refused('not-member');
  const race = room.phase === 'waiting' ? null : await findCurrentRace(transaction, roomId);
  if (!race) return refused('not-started');
  const row = await findCurrentParticipant(transaction, roomId, guestId);
  if (!row) return refused('not-participant');
  const timingRefusal = timingRefusalFor(room.phase, race, reportedAt);
  if (timingRefusal === 'race-over' && isRaceRunning(room.phase)) await settleAtDeadline(transaction, roomId, race);
  if (timingRefusal) return withProgress(timingRefusal, row);
  return judge(transaction, { row, race, request });
}

// The last batch sent after the deadline never counts: the race is measured at the deadline on the server clock.
function timingRefusalFor(phase: RoomPhase, race: CurrentRace, reportedAt: Date): ReportProgressResult | null {
  if (phase === 'results' || isPastDeadline(race.deadlineAt, reportedAt)) return 'race-over';
  return acceptsTypingAt(race.startsAt, reportedAt) ? null : 'not-started';
}

async function judge(transaction: DatabaseTransaction, { row, race, request }: JudgedReport): Promise<ReportProgressOutcome> {
  const stopped = stoppedResultOf(row);
  if (stopped) return withProgress(stopped, row);
  if (await abandonIfGone(transaction, race, { ...row, guestId: request.guestId }, request.reportedAt)) return abandonedWhileGone(transaction, { row, race, request });
  const elapsedSinceStartMs = request.reportedAt.getTime() - race.startsAt.getTime();
  const judgement = judgeProgressReport({ previous: row, report: request.report, passageLength: passageLength(race.passage), elapsedSinceStartMs, errorMode: race.errorMode });
  if (judgement !== 'accepted') return withProgress(judgement, row);
  const accepted = await recordReport(transaction, { row, race, request });
  if (accepted.finishedAt) await settleWhenAllFinished(transaction, request.roomId, race);
  await bumpRevision(transaction, request.roomId);
  return withProgress('accepted', accepted);
}

// Reports queued while the connection was lost for 30 s or more never count: the racer abandoned at the end of that delay.
async function abandonedWhileGone(transaction: DatabaseTransaction, { row, race, request }: JudgedReport): Promise<ReportProgressOutcome> {
  await settleWhenAllFinished(transaction, request.roomId, race);
  await bumpRevision(transaction, request.roomId);
  return withProgress('abandoned', row);
}

// An accepted report is also the racer being seen, so it clears a disconnection the others were shown.
// The race is finished once the cursor reaches the end, even with mistakes left in free mode (CONF-08).
async function recordReport(transaction: DatabaseTransaction, { row, race, request }: JudgedReport): Promise<ParticipantRow> {
  const { report, reportedAt, guestId } = request;
  const finishedAt = report.position === passageLength(race.passage) ? reportedAt : null;
  const changes = { lastSequence: report.sequence, position: report.position, correctCharacters: report.correctCharacters, keystrokes: report.keystrokes, rejectedKeystrokes: report.rejectedKeystrokes };
  await transaction
    .update(schema.raceParticipants)
    .set({ ...changes, lastReportedAt: reportedAt, lastSeenAt: sql`greatest(${schema.raceParticipants.lastSeenAt}, ${reportedAt.toISOString()}::timestamptz)`, disconnectedAt: null, finishedAt })
    .where(and(eq(schema.raceParticipants.raceId, row.raceId), eq(schema.raceParticipants.guestId, guestId)));
  return { ...row, ...changes, lastReportedAt: reportedAt, finishedAt };
}

function refused(result: ReportProgressResult): ReportProgressOutcome {
  return { result, participant: null };
}

function withProgress(result: ReportProgressResult, row: ParticipantRow): ReportProgressOutcome {
  return { result, participant: toParticipantProgress(row) };
}
