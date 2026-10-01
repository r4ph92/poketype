import { and, eq } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import { passageLength } from '@/domain/passage';
import { judgeProgressReport, type ParticipantProgress, type ProgressReport } from '@/domain/progress-report';
import { acceptsTypingAt } from '@/domain/race';
import type { RoomId } from '@/domain/room-id';
import { isRoomOpen, type RoomPhase } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { findCurrentParticipant, findCurrentRace, toParticipantProgress, type CurrentRace, type ParticipantRow } from './race-rows';
import { bumpRevision, isMember, lockRoom } from './room-rows';

export type ReportProgressRequest = { roomId: RoomId; guestId: GuestId; report: ProgressReport; reportedAt: Date };

export type ReportProgressResult =
  | 'accepted'
  | 'not-found'
  | 'not-member'
  | 'not-participant'
  | 'not-started'
  | 'race-over'
  | 'finished'
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
  if (row.finishedAt) return 'finished';
  if (report.sequence <= row.lastSequence) return 'stale';
  if (row.lastReportedAt && reportedAt.getTime() - row.lastReportedAt.getTime() < gameConfig.race.progressBatchMs / 2) return 'too-soon';
  return null;
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
  if (timingRefusal) return withProgress(timingRefusal, row);
  return judge(transaction, { row, race, request });
}

function timingRefusalFor(phase: RoomPhase, race: CurrentRace, reportedAt: Date): ReportProgressResult | null {
  if (phase === 'results') return 'race-over';
  return acceptsTypingAt(race.startsAt, reportedAt) ? null : 'not-started';
}

async function judge(transaction: DatabaseTransaction, { row, race, request }: JudgedReport): Promise<ReportProgressOutcome> {
  if (row.finishedAt) return withProgress('finished', row);
  const elapsedSinceStartMs = request.reportedAt.getTime() - race.startsAt.getTime();
  const judgement = judgeProgressReport({ previous: row, report: request.report, passageLength: passageLength(race.passage), elapsedSinceStartMs });
  if (judgement !== 'accepted') return withProgress(judgement, row);
  const accepted = await recordReport(transaction, { row, race, request });
  await bumpRevision(transaction, request.roomId);
  return withProgress('accepted', accepted);
}

async function recordReport(transaction: DatabaseTransaction, { row, race, request }: JudgedReport): Promise<ParticipantRow> {
  const { report, reportedAt, guestId } = request;
  const finishedAt = report.position === passageLength(race.passage) ? reportedAt : null;
  const changes = { lastSequence: report.sequence, position: report.position, keystrokes: report.keystrokes, rejectedKeystrokes: report.rejectedKeystrokes };
  await transaction
    .update(schema.raceParticipants)
    .set({ ...changes, lastReportedAt: reportedAt, finishedAt })
    .where(and(eq(schema.raceParticipants.raceId, row.raceId), eq(schema.raceParticipants.guestId, guestId)));
  return { ...row, ...changes, lastReportedAt: reportedAt, finishedAt };
}

function refused(result: ReportProgressResult): ReportProgressOutcome {
  return { result, participant: null };
}

function withProgress(result: ReportProgressResult, row: ParticipantRow): ReportProgressOutcome {
  return { result, participant: toParticipantProgress(row) };
}
