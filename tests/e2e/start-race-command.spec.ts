import { expect } from '@playwright/test';
import { frenchPassages } from '../../src/config/passages';
import { gameConfig } from '../../src/config/game';
import type { GuestId } from '../../src/domain/guest-id';
import type { RoomId } from '../../src/domain/room-id';
import type { RoomPhase } from '../../src/domain/room-phase';
import type { Database } from '../../src/server/db/types';
import { joinRoom } from '../../src/server/rooms/room-commands';
import { startRace, type StartRaceResult } from '../../src/server/rooms/start-race';
import { commandTest as test, insertGuest, openRoomForNewHost, whileHoldingRoomRow } from './support/commands';
import { uniqueName } from './support/guests';
import { countMembersOf, readRoomPhase, readRoomRaces, readRoomRevision, setRoomPhase } from './support/rooms';

const leadAndCountdownMs = gameConfig.race.syncLeadMs + gameConfig.race.countdownSeconds * 1000;

async function openRoomWithZoe(database: Database): Promise<{ roomId: RoomId; hostId: GuestId; zoeId: GuestId }> {
  const room = await openRoomForNewHost(database);
  const zoeId = await insertGuest(uniqueName('Zoe '));
  await joinRoom(database, room.roomId, zoeId);
  return { ...room, zoeId };
}

function start(database: Database, roomId: RoomId, guestId: GuestId, requestedAt = new Date()): Promise<StartRaceResult> {
  return startRace(database, { roomId, guestId, requestedAt });
}

async function expectStillWaiting(roomId: RoomId, revisionBefore: number): Promise<void> {
  expect(await readRoomPhase(roomId)).toBe('waiting');
  expect(await readRoomRaces(roomId)).toHaveLength(0);
  expect(await readRoomRevision(roomId)).toBe(revisionBefore);
}

test.describe('the start race command', () => {
  test('refuses a lone host and leaves the room waiting with no race and the same revision', async ({ database }) => {
    const { roomId, hostId } = await openRoomForNewHost(database);
    const revisionBefore = await readRoomRevision(roomId);

    expect(await start(database, roomId, hostId)).toBe('not-enough-players');
    await expectStillWaiting(roomId, revisionBefore);
  });

  test('starts the countdown once, at the request time plus the lead time and countdown, and bumps the revision once', async ({ database }) => {
    const { roomId, hostId } = await openRoomWithZoe(database);
    const revisionBefore = await readRoomRevision(roomId);
    const requestedAt = new Date('2026-09-30T10:00:00.000Z');

    expect(await start(database, roomId, hostId, requestedAt)).toBe('started');
    const [race] = await readRoomRaces(roomId);
    expect(race!.startsAt.getTime()).toBe(requestedAt.getTime() + leadAndCountdownMs);
    expect(await readRoomPhase(roomId)).toBe('countdown');
    expect(await readRoomRevision(roomId)).toBe(revisionBefore + 1);
  });

  test('copies an NFC passage from the French list into the race', async ({ database }) => {
    const { roomId, hostId } = await openRoomWithZoe(database);

    await start(database, roomId, hostId);
    const [race] = await readRoomRaces(roomId);
    expect(frenchPassages).toContain(race!.passage);
    expect(race!.passage).toBe(race!.passage.normalize('NFC'));
  });

  test('refuses a member who is not the host and leaves the room waiting', async ({ database }) => {
    const { roomId, zoeId } = await openRoomWithZoe(database);
    const revisionBefore = await readRoomRevision(roomId);

    expect(await start(database, roomId, zoeId)).toBe('not-host');
    await expectStillWaiting(roomId, revisionBefore);
  });

  test('refuses a guest who is not a member and does not add them', async ({ database }) => {
    const { roomId } = await openRoomWithZoe(database);
    const revisionBefore = await readRoomRevision(roomId);

    expect(await start(database, roomId, await insertGuest(uniqueName('Nina ')))).toBe('not-member');
    await expectStillWaiting(roomId, revisionBefore);
    expect(await countMembersOf(roomId)).toBe(2);
  });

  test('five parallel starts create one race, bump the revision once, and the others answer already-started', async ({ database }) => {
    const { roomId, hostId } = await openRoomWithZoe(database);
    const revisionBefore = await readRoomRevision(roomId);

    const results = await Promise.all(Array.from({ length: 5 }, () => start(database, roomId, hostId)));
    expect(results.filter((result) => result === 'started')).toHaveLength(1);
    expect(results.filter((result) => result === 'already-started')).toHaveLength(4);
    expect(await readRoomRaces(roomId)).toHaveLength(1);
    expect(await readRoomRevision(roomId)).toBe(revisionBefore + 1);
  });

  test('a start waiting behind a join counts the new member', async ({ database }) => {
    const { roomId, hostId } = await openRoomForNewHost(database);
    const zoeId = await insertGuest(uniqueName('Zoe '));
    let joining: Promise<unknown> = Promise.resolve();
    let starting: Promise<StartRaceResult> = Promise.resolve('not-found');

    await whileHoldingRoomRow(roomId, async (waitForQueuedCommands) => {
      joining = joinRoom(database, roomId, zoeId);
      await waitForQueuedCommands(1);
      starting = start(database, roomId, hostId);
      await waitForQueuedCommands(2);
    });

    expect(await joining).toBe('joined');
    expect(await starting).toBe('started');
  });

  test('a join waiting behind a start is refused as race-started', async ({ database }) => {
    const { roomId, hostId } = await openRoomWithZoe(database);
    const ninaId = await insertGuest(uniqueName('Nina '));
    let starting: Promise<StartRaceResult> = Promise.resolve('not-found');
    let joining: Promise<unknown> = Promise.resolve();

    await whileHoldingRoomRow(roomId, async (waitForQueuedCommands) => {
      starting = start(database, roomId, hostId);
      await waitForQueuedCommands(1);
      joining = joinRoom(database, roomId, ninaId);
      await waitForQueuedCommands(2);
    });

    expect(await starting).toBe('started');
    expect(await joining).toBe('race-started');
    expect(await countMembersOf(roomId)).toBe(2);
  });

  for (const phase of ['countdown', 'racing', 'results'] satisfies RoomPhase[]) {
    test(`answers already-started in ${phase} without a new race or revision`, async ({ database }) => {
      const { roomId, hostId } = await openRoomWithZoe(database);
      await setRoomPhase(roomId, phase);
      const racesBefore = (await readRoomRaces(roomId)).length;
      const revisionBefore = await readRoomRevision(roomId);

      expect(await start(database, roomId, hostId)).toBe('already-started');
      expect(await readRoomRaces(roomId)).toHaveLength(racesBefore);
      expect(await readRoomRevision(roomId)).toBe(revisionBefore);
    });
  }

  test('answers not-found for a closed room, even for its host, and for an unknown room', async ({ database }) => {
    const { roomId, hostId } = await openRoomWithZoe(database);
    await setRoomPhase(roomId, 'closed');

    expect(await start(database, roomId, hostId)).toBe('not-found');
    expect(await start(database, crypto.randomUUID() as RoomId, hostId)).toBe('not-found');
    expect(await readRoomRaces(roomId)).toHaveLength(0);
  });
});
