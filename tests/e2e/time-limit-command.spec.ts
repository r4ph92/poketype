import { expect } from '@playwright/test';
import type { GuestId } from '../../src/domain/guest-id';
import { passageLength } from '../../src/domain/passage';
import type { ProgressReport } from '../../src/domain/progress-report';
import { measureRacer, raceRulesVersion } from '../../src/domain/race-results';
import type { RoomId } from '../../src/domain/room-id';
import type { Database } from '../../src/server/db/types';
import { loadRoomSnapshot } from '../../src/server/rooms/load-room-snapshot';
import { settleDueRace } from '../../src/server/rooms/race-deadline';
import { reportProgress, type ReportProgressOutcome } from '../../src/server/rooms/report-progress';
import { commandTest as test, insertGuest, joinRoomNow, openRoomForNewHost, whileHoldingRoomRow } from './support/commands';
import { uniqueName, withTestDatabase } from './support/guests';
import { readRoomPhase, readRoomRaces, readRoomRevision, startRaceInDatabase, testPassage } from './support/rooms';
import { readSettledRace, type SettledResult } from './support/settlement';

type RaceOfTwo = { roomId: RoomId; alexId: GuestId; zoeId: GuestId; startsAt: Date; deadlineAt: Date };

const fullLength = passageLength(testPassage);

async function raceOfTwo(database: Database): Promise<RaceOfTwo> {
  const { roomId, hostId } = await openRoomForNewHost(database);
  const zoeId = await insertGuest(uniqueName('Zoe '));
  await joinRoomNow(database, roomId, zoeId);
  await startRaceInDatabase(roomId, -30_000);
  const [race] = await readRoomRaces(roomId);
  return { roomId, alexId: hostId, zoeId, startsAt: race!.startsAt, deadlineAt: race!.deadlineAt };
}

function typed(sequence: number, position: number, rejectedKeystrokes: number): ProgressReport {
  return { sequence, position, keystrokes: position + rejectedKeystrokes, rejectedKeystrokes };
}

function reportAt(database: Database, race: RaceOfTwo, guestId: GuestId, body: ProgressReport, reportedAt: Date): Promise<ReportProgressOutcome> {
  return reportProgress(database, { roomId: race.roomId, guestId, report: body, reportedAt });
}

function afterStart(race: RaceOfTwo, elapsedMs: number): Date {
  return new Date(race.startsAt.getTime() + elapsedMs);
}

function beforeDeadline(race: RaceOfTwo, earlyMs: number): Date {
  return new Date(race.deadlineAt.getTime() - earlyMs);
}

function resultOf(results: SettledResult[], guestId: GuestId): SettledResult {
  return results.find((result) => result.guestId === guestId)!;
}

// Zoe finishes 20 s in; Alex has typed 20 characters with 3 rejected keystrokes when the time runs out.
async function zoeFinishedAlexTyping(database: Database, race: RaceOfTwo): Promise<void> {
  expect((await reportAt(database, race, race.zoeId, typed(1, fullLength, 0), afterStart(race, 20_000))).result).toBe('accepted');
  expect((await reportAt(database, race, race.alexId, typed(1, 20, 3), afterStart(race, 60_000))).result).toBe('accepted');
}

test.describe('ending the race at its time limit', () => {
  test('the race stays open until the deadline; at the deadline Alex is settled unfinished from what he typed, ranked by score', async ({ database }) => {
    const race = await raceOfTwo(database);
    await zoeFinishedAlexTyping(database, race);
    const revisionBefore = await readRoomRevision(race.roomId);

    expect(await settleDueRace(database, race.roomId, beforeDeadline(race, 1))).toBe(false);
    expect(await readRoomPhase(race.roomId)).toBe('countdown');
    expect(await settleDueRace(database, race.roomId, race.deadlineAt)).toBe(true);

    expect(await readRoomPhase(race.roomId)).toBe('results');
    expect(await readRoomRevision(race.roomId)).toBe(revisionBefore + 1);
    const settled = await readSettledRace(race.roomId);
    expect(settled.endedAt).toEqual(race.deadlineAt);
    expect(settled.rulesVersion).toBe(raceRulesVersion);
    const alex = resultOf(settled.results, race.alexId);
    const expected = measureRacer({ typedCharacters: 20, keystrokes: 23, rejectedKeystrokes: 3, elapsedMs: race.deadlineAt.getTime() - race.startsAt.getTime() });
    expect(alex).toMatchObject({ place: 2, finishMs: null, rejectedKeystrokes: 3 });
    expect(alex.grossWpm).toBeCloseTo(expected.grossWpm, 10);
    expect(alex.score).toBeCloseTo(expected.score, 10);
    expect(alex.accuracy).toBeCloseTo(20 / 23, 10);
    expect(resultOf(settled.results, race.zoeId)).toMatchObject({ place: 1, finishMs: 20_000 });
  });

  test('an unfinished racer with a better score ranks ahead of a sloppy finisher', async ({ database }) => {
    const race = await raceOfTwo(database);
    expect((await reportAt(database, race, race.zoeId, typed(1, fullLength, 60), beforeDeadline(race, 1_000))).result).toBe('accepted');
    expect((await reportAt(database, race, race.alexId, typed(1, 50, 0), afterStart(race, 90_000))).result).toBe('accepted');

    await settleDueRace(database, race.roomId, race.deadlineAt);

    const { results } = await readSettledRace(race.roomId);
    expect(resultOf(results, race.alexId)).toMatchObject({ place: 1, finishMs: null });
    expect(resultOf(results, race.zoeId)).toMatchObject({ place: 2, score: 0 });
  });

  test('a report stamped at the deadline is refused as race-over, settles the race at the deadline, and a later one changes nothing', async ({ database }) => {
    const race = await raceOfTwo(database);
    await zoeFinishedAlexTyping(database, race);
    const revisionBefore = await readRoomRevision(race.roomId);

    const atDeadline = await reportAt(database, race, race.alexId, typed(2, 40, 3), race.deadlineAt);
    expect(atDeadline.result).toBe('race-over');
    expect(atDeadline.participant).toMatchObject({ position: 20, rejectedKeystrokes: 3, finishMs: null });
    expect(await readRoomRevision(race.roomId)).toBe(revisionBefore + 1);
    const settled = await readSettledRace(race.roomId);
    expect(settled.endedAt).toEqual(race.deadlineAt);
    expect(resultOf(settled.results, race.alexId)).toMatchObject({ place: 2, finishMs: null });

    const later = await reportAt(database, race, race.alexId, typed(3, 45, 3), new Date(race.deadlineAt.getTime() + 5_000));
    expect(later.result).toBe('race-over');
    expect(await readSettledRace(race.roomId)).toEqual(settled);
    expect(await readRoomRevision(race.roomId)).toBe(revisionBefore + 1);
  });

  test('a finishing report 1 ms before the deadline is accepted and settles the race at that finish', async ({ database }) => {
    const race = await raceOfTwo(database);
    expect((await reportAt(database, race, race.zoeId, typed(1, fullLength, 0), afterStart(race, 20_000))).result).toBe('accepted');

    const lastFinish = beforeDeadline(race, 1);
    expect((await reportAt(database, race, race.alexId, typed(1, fullLength, 0), lastFinish)).result).toBe('accepted');

    const settled = await readSettledRace(race.roomId);
    expect(settled.endedAt).toEqual(lastFinish);
    expect(resultOf(settled.results, race.alexId).finishMs).toBe(lastFinish.getTime() - race.startsAt.getTime());
    expect(await readRoomPhase(race.roomId)).toBe('results');
  });

  test('before the deadline, an accepted report from a racer still typing does not settle the race', async ({ database }) => {
    const race = await raceOfTwo(database);
    await zoeFinishedAlexTyping(database, race);

    expect((await reportAt(database, race, race.alexId, typed(2, 30, 3), beforeDeadline(race, 1))).result).toBe('accepted');

    expect(await readRoomPhase(race.roomId)).toBe('countdown');
    expect((await readSettledRace(race.roomId)).endedAt).toBeNull();
  });

  test('two deadline settlements queued behind the room lock settle the race once, with one revision', async ({ database }) => {
    const race = await raceOfTwo(database);
    await zoeFinishedAlexTyping(database, race);
    const revisionBefore = await readRoomRevision(race.roomId);
    const outcomes: Promise<boolean>[] = [];

    await whileHoldingRoomRow(race.roomId, async (waitForQueuedCommands) => {
      outcomes.push(settleDueRace(database, race.roomId, race.deadlineAt));
      await waitForQueuedCommands(1);
      outcomes.push(settleDueRace(database, race.roomId, new Date(race.deadlineAt.getTime() + 300)));
      await waitForQueuedCommands(2);
    });

    expect(await Promise.all(outcomes)).toEqual([true, false]);
    expect((await readSettledRace(race.roomId)).endedAt).toEqual(race.deadlineAt);
    expect(await readRoomRevision(race.roomId)).toBe(revisionBefore + 1);
  });

  test('a snapshot read and a late report racing at the deadline settle the race once; the reader sees the results', async ({ database }) => {
    const race = await raceOfTwo(database);
    await zoeFinishedAlexTyping(database, race);
    const revisionBefore = await readRoomRevision(race.roomId);
    const reads: ReturnType<typeof loadRoomSnapshot>[] = [];
    const lateReports: Promise<ReportProgressOutcome>[] = [];

    await whileHoldingRoomRow(race.roomId, async (waitForQueuedCommands) => {
      reads.push(loadRoomSnapshot(database, race.roomId, race.zoeId, race.deadlineAt));
      await waitForQueuedCommands(1);
      lateReports.push(reportAt(database, race, race.alexId, typed(2, 40, 3), new Date(race.deadlineAt.getTime() + 100)));
      await waitForQueuedCommands(2);
    });

    const [loaded] = await Promise.all(reads);
    const found = loaded?.found;
    expect(loaded?.hasChangedRoom).toBe(true);
    const [late] = await Promise.all(lateReports);
    expect(late!.result).toBe('race-over');
    const snapshot = found?.kind === 'snapshot' ? found.snapshot : null;
    expect(snapshot?.phase).toBe('results');
    expect(snapshot?.race?.results?.map((result) => (result.abandoned ? null : result.finishMs)).sort()).toEqual([20_000, null]);
    expect((await readSettledRace(race.roomId)).endedAt).toEqual(race.deadlineAt);
    expect(await readRoomRevision(race.roomId)).toBe(revisionBefore + 1);
  });

  test('a snapshot read before the deadline writes nothing and shows the deadline on the server clock', async ({ database }) => {
    const race = await raceOfTwo(database);
    const revisionBefore = await readRoomRevision(race.roomId);

    const { found, hasChangedRoom } = await loadRoomSnapshot(database, race.roomId, race.zoeId, beforeDeadline(race, 1));
    expect(hasChangedRoom).toBe(false);

    expect(found.kind === 'snapshot' && found.snapshot.race?.deadlineAt).toBe(race.deadlineAt.getTime());
    expect(found.kind === 'snapshot' && found.snapshot.phase).toBe('countdown');
    expect(await readRoomRevision(race.roomId)).toBe(revisionBefore);
  });

  test('a closed room is never reopened by a deadline that passed', async ({ database }) => {
    const race = await raceOfTwo(database);
    await withTestDatabase((sql) => sql`update rooms set phase = 'closed' where id = ${race.roomId}`);

    expect(await settleDueRace(database, race.roomId, race.deadlineAt)).toBe(false);
    expect(await readRoomPhase(race.roomId)).toBe('closed');
    expect((await readSettledRace(race.roomId)).endedAt).toBeNull();
  });
});
