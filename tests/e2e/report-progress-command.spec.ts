import { expect } from '@playwright/test';
import { gameConfig } from '../../src/config/game';
import type { GuestId } from '../../src/domain/guest-id';
import { passageLength } from '../../src/domain/passage';
import type { ProgressReport } from '../../src/domain/progress-report';
import type { RoomId } from '../../src/domain/room-id';
import type { RoomPhase } from '../../src/domain/room-phase';
import * as schema from '../../src/server/db/schema';
import type { Database } from '../../src/server/db/types';
import { reportProgress, type ReportProgressOutcome } from '../../src/server/rooms/report-progress';
import { commandTest as test, insertGuest, joinRoomNow, openRoomForNewHost, whileHoldingRoomRow } from './support/commands';
import { uniqueName } from './support/guests';
import { readParticipants, readRoomRaces, readRoomRevision, setRoomPhase, testPassage, type StoredParticipant } from './support/rooms';

type RaceOfTwo = { roomId: RoomId; hostId: GuestId; zoeId: GuestId };

const fullLength = passageLength(testPassage);
const spacingMs = gameConfig.race.progressBatchMs;

async function raceOfTwo(database: Database, phase: RoomPhase = 'countdown', startsInMs = -60_000): Promise<RaceOfTwo> {
  const room = await openRoomForNewHost(database);
  const zoeId = await insertGuest(uniqueName('Zoe '));
  await joinRoomNow(database, room.roomId, zoeId);
  await setRoomPhase(room.roomId, phase, startsInMs);
  return { ...room, zoeId };
}

function progress(sequence: number, position: number, rejectedKeystrokes = 0): ProgressReport {
  return { sequence, position, keystrokes: position + rejectedKeystrokes, rejectedKeystrokes };
}

function report(database: Database, race: RaceOfTwo, body: ProgressReport, reportedAt = new Date()): Promise<ReportProgressOutcome> {
  return reportProgress(database, { roomId: race.roomId, guestId: race.zoeId, report: body, reportedAt });
}

async function zoeRow(race: RaceOfTwo): Promise<StoredParticipant> {
  return (await readParticipants(race.roomId)).find((participant) => participant.guestId === race.zoeId)!;
}

async function expectRefusedWithoutChange(race: RaceOfTwo, refusal: () => Promise<ReportProgressOutcome>, result: string): Promise<void> {
  const rowBefore = await zoeRow(race);
  const revisionBefore = await readRoomRevision(race.roomId);
  expect((await refusal()).result).toBe(result);
  expect(await zoeRow(race)).toEqual(rowBefore);
  expect(await readRoomRevision(race.roomId)).toBe(revisionBefore);
}

test.describe('the report progress command', () => {
  test('accepts a consistent report: stores the counters and sequence, bumps the revision once, and answers the stored row', async ({ database }) => {
    const race = await raceOfTwo(database);
    const revisionBefore = await readRoomRevision(race.roomId);
    const reportedAt = new Date();

    const outcome = await report(database, race, progress(1, 5, 2), reportedAt);
    expect(outcome).toEqual({ result: 'accepted', participant: { lastSequence: 1, position: 5, keystrokes: 7, rejectedKeystrokes: 2, finishMs: null } });
    expect(await zoeRow(race)).toMatchObject({ position: 5, keystrokes: 7, rejectedKeystrokes: 2, lastSequence: 1, lastReportedAt: reportedAt, finishedAt: null });
    expect(await readRoomRevision(race.roomId)).toBe(revisionBefore + 1);
  });

  test('the last character sets the finish time once, measured from the start; a later report answers finished', async ({ database }) => {
    const race = await raceOfTwo(database);
    const [stored] = await readRoomRaces(race.roomId);
    const finishedAt = new Date();

    const outcome = await report(database, race, progress(1, fullLength), finishedAt);
    expect(outcome.result).toBe('accepted');
    expect(outcome.participant!.finishMs).toBe(finishedAt.getTime() - stored!.startsAt.getTime());
    expect((await zoeRow(race)).finishedAt).toEqual(finishedAt);
    await expectRefusedWithoutChange(race, () => report(database, race, progress(2, fullLength, 1), new Date(finishedAt.getTime() + spacingMs)), 'finished');
  });

  test('the other racer keeps racing after one finishes', async ({ database }) => {
    const race = await raceOfTwo(database);
    await report(database, race, progress(1, fullLength));

    const alexOutcome = await reportProgress(database, { roomId: race.roomId, guestId: race.hostId, report: progress(1, 3), reportedAt: new Date() });
    expect(alexOutcome.result).toBe('accepted');
  });

  test.describe('refuses and changes nothing', () => {
    test('a position beyond the passage', async ({ database }) => {
      const race = await raceOfTwo(database);
      await expectRefusedWithoutChange(race, () => report(database, race, progress(1, fullLength + 1)), 'implausible');
    });

    test('more characters than correct keystrokes', async ({ database }) => {
      const race = await raceOfTwo(database);
      await expectRefusedWithoutChange(race, () => report(database, race, { sequence: 1, position: 10, keystrokes: 3, rejectedKeystrokes: 0 }), 'implausible');
    });

    test('a jump faster than the cumulative speed cap', async ({ database }) => {
      const race = await raceOfTwo(database, 'countdown', -1_000);
      await expectRefusedWithoutChange(race, () => report(database, race, progress(1, fullLength)), 'implausible');
    });

    test('a position moving back', async ({ database }) => {
      const race = await raceOfTwo(database);
      const firstAt = Date.now();
      await report(database, race, progress(1, 8), new Date(firstAt));
      await expectRefusedWithoutChange(race, () => report(database, race, progress(2, 4, 4), new Date(firstAt + spacingMs)), 'implausible');
    });

    test('a sequence that is not newer', async ({ database }) => {
      const race = await raceOfTwo(database);
      const firstAt = Date.now();
      await report(database, race, progress(3, 4), new Date(firstAt));
      await expectRefusedWithoutChange(race, () => report(database, race, progress(3, 6), new Date(firstAt + spacingMs)), 'stale');
      await expectRefusedWithoutChange(race, () => report(database, race, progress(2, 6), new Date(firstAt + 2 * spacingMs)), 'stale');
    });

    test('a report sooner than half a batch after the last accepted one', async ({ database }) => {
      const race = await raceOfTwo(database);
      const firstAt = Date.now();
      await report(database, race, progress(1, 2), new Date(firstAt));
      await expectRefusedWithoutChange(race, () => report(database, race, progress(2, 3), new Date(firstAt + spacingMs / 2 - 1)), 'too-soon');
      expect((await report(database, race, progress(2, 3), new Date(firstAt + spacingMs / 2))).result).toBe('accepted');
    });

    test('a report before the start time, judged with the time it arrived', async ({ database }) => {
      const race = await raceOfTwo(database, 'countdown', 5_000);
      await expectRefusedWithoutChange(race, () => report(database, race, progress(1, 1)), 'not-started');
    });

    test('a report in a waiting room', async ({ database }) => {
      const room = await openRoomForNewHost(database);
      const zoeId = await insertGuest(uniqueName('Zoe '));
      await joinRoomNow(database, room.roomId, zoeId);
      const revisionBefore = await readRoomRevision(room.roomId);

      expect(await reportProgress(database, { roomId: room.roomId, guestId: zoeId, report: progress(1, 1), reportedAt: new Date() })).toEqual({ result: 'not-started', participant: null });
      expect(await readRoomRevision(room.roomId)).toBe(revisionBefore);
    });

    test('a report once the race is over', async ({ database }) => {
      const race = await raceOfTwo(database, 'results');
      await expectRefusedWithoutChange(race, () => report(database, race, progress(1, 1)), 'race-over');
    });

    test('a report for a closed or unknown room', async ({ database }) => {
      const race = await raceOfTwo(database, 'closed');
      expect((await report(database, race, progress(1, 1))).result).toBe('not-found');
      expect((await report(database, { ...race, roomId: crypto.randomUUID() as RoomId }, progress(1, 1))).result).toBe('not-found');
    });

    test('a guest who is not a member, without telling them anything about the race', async ({ database }) => {
      const race = await raceOfTwo(database);
      const ninaId = await insertGuest(uniqueName('Nina '));
      const revisionBefore = await readRoomRevision(race.roomId);

      expect(await report(database, { ...race, zoeId: ninaId }, progress(1, 1))).toEqual({ result: 'not-member', participant: null });
      expect(await readRoomRevision(race.roomId)).toBe(revisionBefore);
    });

    test('a member who is not a participant of the current race', async ({ database }) => {
      const race = await raceOfTwo(database);
      const ninaId = await insertGuest(uniqueName('Nina '));
      await database.insert(schema.roomMembers).values({ roomId: race.roomId, guestId: ninaId });

      expect(await report(database, { ...race, zoeId: ninaId }, progress(1, 1))).toEqual({ result: 'not-participant', participant: null });
    });
  });

  test('two reports with the same sequence queued behind the room lock: exactly one is accepted', async ({ database }) => {
    const race = await raceOfTwo(database);
    const revisionBefore = await readRoomRevision(race.roomId);
    const outcomes: Promise<ReportProgressOutcome>[] = [];

    await whileHoldingRoomRow(race.roomId, async (waitForQueuedCommands) => {
      outcomes.push(report(database, race, progress(1, 3)));
      await waitForQueuedCommands(1);
      outcomes.push(report(database, race, progress(1, 4)));
      await waitForQueuedCommands(2);
    });

    expect((await Promise.all(outcomes)).map((outcome) => outcome.result)).toEqual(['accepted', 'stale']);
    expect((await zoeRow(race)).position).toBe(3);
    expect(await readRoomRevision(race.roomId)).toBe(revisionBefore + 1);
  });
});
