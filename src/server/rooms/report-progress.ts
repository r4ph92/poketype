import { and, eq, sql, type SQL } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import { addMissedCharacters, noMissedCharacters, type MissedCharacterCounts } from '@/domain/missed-characters';
import { passageCharacters, passageLength } from '@/domain/passage';
import { judgeProgressReport, withMissedPositions, type ParticipantProgress, type ProgressReport } from '@/domain/progress-report';
import { acceptsTypingAt, isPastDeadline } from '@/domain/race';
import { isIdleSince } from '@/domain/race-idleness';
import type { RoomId } from '@/domain/room-id';
import { isRaceRunning, isRoomOpen, type RoomPhase } from '@/domain/room-phase';
import { samplesToAppend } from '@/domain/wpm-timeline';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { findCurrentParticipant, findCurrentRace, toParticipantProgress, type CurrentRace, type ParticipantRow } from './race-rows';
import { bumpRevision, isMember, lockRoom } from './room-rows';
import { settleAtDeadline, settleDueEnding } from './race-deadline';
import { abandonIfGone } from './race-presence';
import { awardCatchUpBonuses } from './catch-up-bonuses';
import { findRaceBonuses, racerTextIn, type RaceBonusRow } from './race-bonuses';
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

// ownText is the racer's own text after their bonuses; judgedText is what reports are bounded by and missed characters read from.
type RacerTexts = { ownText: string; judgedText: string };

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
  if (await settledForInactivity(transaction, { race, row, request })) return withProgress('race-over', row);
  return judge(transaction, { row, race, request });
}

// A report arriving after the idle end of a race nobody had read yet is too late: the race ended there. The racer's own last report is the cheap
// check; only when it is old enough are the other racers read.
async function settledForInactivity(transaction: DatabaseTransaction, { race, row, request }: JudgedReport): Promise<boolean> {
  if (!isIdleSince((row.lastReportedAt ?? race.startsAt).getTime(), request.reportedAt.getTime())) return false;
  return settleDueEnding(transaction, request.roomId, race, request.reportedAt);
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
  const bonuses = await findRaceBonuses(transaction, race);
  const texts = racerTextsOf(race, bonuses, request.guestId);
  const elapsedSinceStartMs = request.reportedAt.getTime() - race.startsAt.getTime();
  const judgement = judgeProgressReport({ previous: row, report: request.report, passageLength: passageLength(texts.judgedText), elapsedSinceStartMs, errorMode: race.errorMode });
  if (judgement !== 'accepted') return withProgress(judgement, row);
  const accepted = await recordReport(transaction, { row, race, request }, texts);
  await awardCatchUpBonuses(transaction, request.roomId, race, bonuses, request.reportedAt);
  if (accepted.finishedAt) await settleWhenAllFinished(transaction, request.roomId, race);
  await bumpRevision(transaction, request.roomId);
  return withProgress('accepted', accepted);
}

// Reports are judged against the longer of the passage and the racer's own text: characters typed into words a "-3 mots" removed before the page
// knew it still count, and a leader can type the words a "+3 mots" appended.
function racerTextsOf(race: CurrentRace, bonuses: readonly RaceBonusRow[], guestId: GuestId): RacerTexts {
  const ownText = racerTextIn(race, bonuses, guestId);
  return { ownText, judgedText: passageLength(ownText) > passageLength(race.passage) ? ownText : race.passage };
}

// Reports queued while the connection was lost for 30 s or more never count: the racer abandoned at the end of that delay.
async function abandonedWhileGone(transaction: DatabaseTransaction, { row, race, request }: JudgedReport): Promise<ReportProgressOutcome> {
  await settleWhenAllFinished(transaction, request.roomId, race);
  await bumpRevision(transaction, request.roomId);
  return withProgress('abandoned', row);
}

// An accepted report is also the racer being seen, so it clears a disconnection the others were shown.
// The race is finished once the cursor reaches the end of the racer's own text, even with mistakes left in free mode (CONF-08), so a report typed
// into removed words finishes it too (BONUS-04).
async function recordReport(transaction: DatabaseTransaction, { row, race, request }: JudgedReport, texts: RacerTexts): Promise<ParticipantRow> {
  const { report, reportedAt, guestId } = request;
  const finishedAt = report.position >= passageLength(texts.ownText) ? reportedAt : null;
  const changes = { ...storedCountersOf(report), missedCharacters: missedCharactersAfter(row, texts.judgedText, report) };
  await transaction
    .update(schema.raceParticipants)
    .set({ ...changes, correctCharactersBySecond: timelineAfter(row, race, reportedAt), lastReportedAt: reportedAt, lastSeenAt: sql`greatest(${schema.raceParticipants.lastSeenAt}, ${reportedAt.toISOString()}::timestamptz)`, disconnectedAt: null, finishedAt })
    .where(and(eq(schema.raceParticipants.raceId, row.raceId), eq(schema.raceParticipants.guestId, guestId)));
  return { ...row, ...changes, lastReportedAt: reportedAt, finishedAt };
}

function storedCountersOf({ sequence, position, correctCharacters, keystrokes, rejectedKeystrokes }: ProgressReport) {
  return { lastSequence: sequence, position, correctCharacters, keystrokes, rejectedKeystrokes };
}

// The characters come from the stored text at the judged indices, never from the client.
function missedCharactersAfter(row: ParticipantRow, judgedText: string, report: ProgressReport): MissedCharacterCounts {
  return addMissedCharacters(row.missedCharacters ?? noMissedCharacters, passageCharacters(judgedText), withMissedPositions(report).missedPositions);
}

// The new samples are appended in the database, so a report never reads or resends the timeline stored so far (#147).
function timelineAfter(row: ParticipantRow, race: CurrentRace, reportedAt: Date): SQL {
  const startMs = race.startsAt.getTime();
  const previousReportMs = row.lastReportedAt ? row.lastReportedAt.getTime() - startMs : null;
  const samples = samplesToAppend({ previousReportMs, reportMs: reportedAt.getTime() - startMs, previousCorrectCharacters: row.correctCharacters });
  return sql`coalesce(${schema.raceParticipants.correctCharactersBySecond}, '[]'::jsonb) || ${JSON.stringify(samples)}::jsonb`;
}

function refused(result: ReportProgressResult): ReportProgressOutcome {
  return { result, participant: null };
}

function withProgress(result: ReportProgressResult, row: ParticipantRow): ReportProgressOutcome {
  return { result, participant: toParticipantProgress(row) };
}
