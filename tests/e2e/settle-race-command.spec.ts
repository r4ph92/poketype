import { expect } from '@playwright/test';
import type { GuestId } from '../../src/domain/guest-id';
import { passageLength } from '../../src/domain/passage';
import type { ProgressReport } from '../../src/domain/progress-report';
import { raceRulesVersion } from '../../src/domain/race-results';
import type { RoomId } from '../../src/domain/room-id';
import type { Database } from '../../src/server/db/types';
import { findCurrentRace } from '../../src/server/rooms/race-rows';
import { reportProgress, type ReportProgressOutcome } from '../../src/server/rooms/report-progress';
import { joinRoom } from '../../src/server/rooms/room-commands';
import { settleRace } from '../../src/server/rooms/settle-race';
import { commandTest as test, insertGuest, openRoomForNewHost, whileHoldingRoomRow } from './support/commands';
import { uniqueName } from './support/guests';
import { readRoomPhase, readRoomRaces, readRoomRevision, startRaceInDatabase, testPassage } from './support/rooms';
import { readSettledRace, type SettledResult } from './support/settlement';

type RaceOfTwo = { roomId: RoomId; alexId: GuestId; zoeId: GuestId; startsAt: Date };

const fiftyCharacterPassage = 'Le chat de Zoé dort sur le tapis rouge du salon ce';
const fullLength = passageLength(testPassage);

async function raceOfTwo(database: Database, passage = testPassage): Promise<RaceOfTwo> {
  const { roomId, hostId } = await openRoomForNewHost(database);
  const zoeId = await insertGuest(uniqueName('Zoe '));
  await joinRoom(database, roomId, zoeId);
  await startRaceInDatabase(roomId, -30_000, { passage });
  const [race] = await readRoomRaces(roomId);
  return { roomId, alexId: hostId, zoeId, startsAt: race!.startsAt };
}

function finish(length: number, rejectedKeystrokes: number): ProgressReport {
  return { sequence: 1, position: length, keystrokes: length + rejectedKeystrokes, rejectedKeystrokes };
}

function reportAt(database: Database, race: RaceOfTwo, guestId: GuestId, body: ProgressReport, elapsedMs: number): Promise<ReportProgressOutcome> {
  return reportProgress(database, { roomId: race.roomId, guestId, report: body, reportedAt: new Date(race.startsAt.getTime() + elapsedMs) });
}

function resultOf(results: SettledResult[], guestId: GuestId): SettledResult {
  return results.find((result) => result.guestId === guestId)!;
}

test.describe('settling the race', () => {
  test('the first finish leaves the race open; the last finish settles every racer, ends the race and shows the results, with one revision each', async ({ database }) => {
    const race = await raceOfTwo(database);
    const revisionBefore = await readRoomRevision(race.roomId);

    expect((await reportAt(database, race, race.zoeId, finish(fullLength, 0), 20_000)).result).toBe('accepted');
    expect(await readRoomPhase(race.roomId)).toBe('countdown');
    const open = await readSettledRace(race.roomId);
    expect(open.endedAt).toBeNull();
    expect(open.rulesVersion).toBeNull();
    expect(open.results.every((result) => result.place === null && result.grossWpm === null)).toBe(true);

    expect((await reportAt(database, race, race.alexId, finish(fullLength, 3), 25_000)).result).toBe('accepted');
    expect(await readRoomPhase(race.roomId)).toBe('results');
    const settled = await readSettledRace(race.roomId);
    expect(settled.endedAt).toEqual(new Date(race.startsAt.getTime() + 25_000));
    expect(settled.rulesVersion).toBe(raceRulesVersion);
    expect(resultOf(settled.results, race.zoeId).place).toBe(1);
    expect(resultOf(settled.results, race.alexId).place).toBe(2);
    expect(await readRoomRevision(race.roomId)).toBe(revisionBefore + 2);
  });

  test("Zoe's 50 characters in 30 s with 2 rejected keystrokes store 20 WPM, a score of 16 and 50/52 accuracy, and beat a faster but sloppier Alex", async ({ database }) => {
    expect(passageLength(fiftyCharacterPassage)).toBe(50);
    const race = await raceOfTwo(database, fiftyCharacterPassage);

    await reportAt(database, race, race.alexId, finish(50, 6), 25_000);
    await reportAt(database, race, race.zoeId, finish(50, 2), 30_000);

    const { results } = await readSettledRace(race.roomId);
    const zoe = resultOf(results, race.zoeId);
    const alex = resultOf(results, race.alexId);
    expect(zoe).toMatchObject({ place: 1, rejectedKeystrokes: 2, finishMs: 30_000 });
    expect(zoe.grossWpm).toBeCloseTo(20, 10);
    expect(zoe.score).toBeCloseTo(16, 10);
    expect(zoe.accuracy).toBeCloseTo(50 / 52, 10);
    expect(alex.grossWpm!).toBeGreaterThan(zoe.grossWpm!);
    expect(alex.score!).toBeLessThan(zoe.score!);
    expect(alex.place).toBe(2);
  });

  test('both last reports queued behind the room lock: both are accepted and the race settles once', async ({ database }) => {
    const race = await raceOfTwo(database);
    const revisionBefore = await readRoomRevision(race.roomId);
    const outcomes: Promise<ReportProgressOutcome>[] = [];

    await whileHoldingRoomRow(race.roomId, async (waitForQueuedCommands) => {
      outcomes.push(reportAt(database, race, race.zoeId, finish(fullLength, 0), 20_000));
      await waitForQueuedCommands(1);
      outcomes.push(reportAt(database, race, race.alexId, finish(fullLength, 0), 21_000));
      await waitForQueuedCommands(2);
    });

    expect((await Promise.all(outcomes)).map((outcome) => outcome.result)).toEqual(['accepted', 'accepted']);
    const settled = await readSettledRace(race.roomId);
    expect(settled.endedAt).toEqual(new Date(race.startsAt.getTime() + 21_000));
    expect(settled.results.map((result) => result.place).sort()).toEqual([1, 2]);
    expect(await readRoomRevision(race.roomId)).toBe(revisionBefore + 2);
  });

  test('settling again changes nothing, and a later report is refused without changing the results', async ({ database }) => {
    const race = await raceOfTwo(database);
    await reportAt(database, race, race.zoeId, finish(fullLength, 1), 20_000);
    await reportAt(database, race, race.alexId, finish(fullLength, 0), 22_000);
    const settled = await readSettledRace(race.roomId);
    const revision = await readRoomRevision(race.roomId);

    await database.transaction(async (transaction) => {
      const current = (await findCurrentRace(transaction, race.roomId))!;
      await settleRace(transaction, { roomId: race.roomId, race: current, endedAt: new Date() });
    });
    expect(await readSettledRace(race.roomId)).toEqual(settled);

    const late = await reportAt(database, race, race.alexId, { ...finish(fullLength, 0), sequence: 2 }, 23_000);
    expect(late.result).toBe('finished');
    expect(await readSettledRace(race.roomId)).toEqual(settled);
    expect(await readRoomRevision(race.roomId)).toBe(revision);
  });
});
