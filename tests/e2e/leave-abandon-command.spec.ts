import { expect } from '@playwright/test';
import { passageLength } from '../../src/domain/passage';
import type { GuestId } from '../../src/domain/guest-id';
import type { RoomId } from '../../src/domain/room-id';
import type { Database } from '../../src/server/db/types';
import { abandonRace, type AbandonRaceResult } from '../../src/server/rooms/abandon-race';
import { leaveRoom, type LeaveRoomResult } from '../../src/server/rooms/leave-room';
import { reportProgress } from '../../src/server/rooms/report-progress';
import { commandTest as test, insertGuest, joinRoomNow, openRoomForNewHost } from './support/commands';
import { uniqueName } from './support/guests';
import { countMembersOf, readRoomPhase, readRoomRaces, readRoomRevision, startRaceInDatabase, testPassage } from './support/rooms';
import { readSettledRace } from './support/settlement';

type Room = { roomId: RoomId; alexId: GuestId; zoeId: GuestId };

const fullLength = passageLength(testPassage);

async function waitingRoom(database: Database): Promise<Room> {
  const { roomId, hostId } = await openRoomForNewHost(database);
  const zoeId = await insertGuest(uniqueName('Zoe '));
  await joinRoomNow(database, roomId, zoeId);
  return { roomId, alexId: hostId, zoeId };
}

async function racingRoom(database: Database): Promise<Room & { startsAt: Date }> {
  const room = await waitingRoom(database);
  await startRaceInDatabase(room.roomId, -30_000);
  const [race] = await readRoomRaces(room.roomId);
  return { ...room, startsAt: race!.startsAt };
}

function leave(database: Database, roomId: RoomId, guestId: GuestId): Promise<LeaveRoomResult> {
  return leaveRoom(database, { roomId, guestId, leftAt: new Date() });
}

function abandon(database: Database, roomId: RoomId, guestId: GuestId, abandonedAt = new Date()): Promise<AbandonRaceResult> {
  return abandonRace(database, { roomId, guestId, abandonedAt });
}

async function finishAt(database: Database, room: Room & { startsAt: Date }, guestId: GuestId, elapsedMs: number): Promise<void> {
  const report = { sequence: 1, position: fullLength, keystrokes: fullLength, rejectedKeystrokes: 0 };
  const outcome = await reportProgress(database, { roomId: room.roomId, guestId, report, reportedAt: new Date(room.startsAt.getTime() + elapsedMs) });
  expect(outcome.result).toBe('accepted');
}

test.describe('leaving the room', () => {
  test('a guest leaving the waiting room is dropped, the revision moves once, and they can rejoin while it still waits', async ({ database }) => {
    const { roomId, zoeId } = await waitingRoom(database);
    const revisionBefore = await readRoomRevision(roomId);

    expect(await leave(database, roomId, zoeId)).toBe('left');
    expect(await countMembersOf(roomId)).toBe(1);
    expect(await readRoomRevision(roomId)).toBe(revisionBefore + 1);
    expect(await joinRoomNow(database, roomId, zoeId)).toBe('joined');
  });

  test('a guest leaving mid-race abandons the race, is listed as abandoned in the results and cannot rejoin', async ({ database }) => {
    const room = await racingRoom(database);

    expect(await leave(database, room.roomId, room.zoeId)).toBe('left');
    expect(await joinRoomNow(database, room.roomId, room.zoeId)).toBe('already-member');
    await finishAt(database, room, room.alexId, 20_000);
    const settled = await readSettledRace(room.roomId);
    expect(settled.results.find((result) => result.guestId === room.zoeId)).toMatchObject({ place: null, score: null });
    expect(settled.results.find((result) => result.guestId === room.alexId)!.place).toBe(1);
  });

  test('a guest who never was a member cannot leave, and an unknown room is not found', async ({ database }) => {
    const { roomId } = await waitingRoom(database);
    const stranger = await insertGuest(uniqueName('Nina '));
    const revisionBefore = await readRoomRevision(roomId);

    expect(await leave(database, roomId, stranger)).toBe('not-member');
    expect(await leave(database, '00000000-0000-4000-8000-000000000000' as RoomId, stranger)).toBe('not-found');
    expect(await countMembersOf(roomId)).toBe(2);
    expect(await readRoomRevision(roomId)).toBe(revisionBefore);
  });

  test('the host leaving closes the room for everyone and discards a running race without settling it', async ({ database }) => {
    const room = await racingRoom(database);

    expect(await leave(database, room.roomId, room.alexId)).toBe('closed');
    expect(await readRoomPhase(room.roomId)).toBe('closed');
    const settled = await readSettledRace(room.roomId);
    expect(settled.endedAt).toBeNull();
    expect(settled.results.every((result) => result.place === null)).toBe(true);
    expect(await leave(database, room.roomId, room.zoeId)).toBe('not-found');
  });

  test('the host leaving the waiting room closes it', async ({ database }) => {
    const { roomId, alexId } = await waitingRoom(database);

    expect(await leave(database, roomId, alexId)).toBe('closed');
    expect(await readRoomPhase(roomId)).toBe('closed');
  });
});

test.describe('abandoning the race', () => {
  test('the last finisher ends the race at once when the other racer abandoned, and the abandoner has no place', async ({ database }) => {
    const room = await racingRoom(database);

    expect(await abandon(database, room.roomId, room.zoeId, new Date(room.startsAt.getTime() + 10_000))).toBe('abandoned');
    expect(await readRoomPhase(room.roomId)).toBe('countdown');
    await finishAt(database, room, room.alexId, 20_000);

    expect(await readRoomPhase(room.roomId)).toBe('results');
    const settled = await readSettledRace(room.roomId);
    expect(settled.endedAt).toEqual(new Date(room.startsAt.getTime() + 20_000));
    expect(settled.results.find((result) => result.guestId === room.zoeId)).toMatchObject({ place: null, grossWpm: null });
  });

  test('abandoning after every other racer finished settles the race at once', async ({ database }) => {
    const room = await racingRoom(database);
    await finishAt(database, room, room.alexId, 20_000);
    expect(await readRoomPhase(room.roomId)).toBe('countdown');

    expect(await abandon(database, room.roomId, room.zoeId)).toBe('abandoned');

    expect(await readRoomPhase(room.roomId)).toBe('results');
    expect((await readSettledRace(room.roomId)).results.find((result) => result.guestId === room.alexId)!.place).toBe(1);
  });

  test('a second abandon changes nothing, and a finished racer cannot abandon', async ({ database }) => {
    const room = await racingRoom(database);
    await finishAt(database, room, room.alexId, 20_000);

    expect(await abandon(database, room.roomId, room.alexId)).toBe('finished');
    expect(await abandon(database, room.roomId, room.zoeId)).toBe('abandoned');
    const revision = await readRoomRevision(room.roomId);
    expect(await abandon(database, room.roomId, room.zoeId)).toBe('not-racing');
    expect(await readRoomRevision(room.roomId)).toBe(revision);
  });

  test('a progress report from an abandoned racer is refused and changes nothing', async ({ database }) => {
    const room = await racingRoom(database);
    await abandon(database, room.roomId, room.zoeId);
    const revision = await readRoomRevision(room.roomId);
    const report = { sequence: 1, position: 3, keystrokes: 3, rejectedKeystrokes: 0 };

    const outcome = await reportProgress(database, { roomId: room.roomId, guestId: room.zoeId, report, reportedAt: new Date(room.startsAt.getTime() + 5_000) });

    expect(outcome.result).toBe('abandoned');
    expect(await readRoomRevision(room.roomId)).toBe(revision);
  });

  test('a non-member cannot abandon, and a waiting room has no race to abandon', async ({ database }) => {
    const room = await waitingRoom(database);
    const stranger = await insertGuest(uniqueName('Nina '));

    expect(await abandon(database, room.roomId, stranger)).toBe('not-member');
    expect(await abandon(database, room.roomId, room.zoeId)).toBe('not-racing');
  });

  test('abandoning during the countdown is allowed and the race cannot end before it starts', async ({ database }) => {
    const room = await waitingRoom(database);
    await startRaceInDatabase(room.roomId, 10_000);
    const [race] = await readRoomRaces(room.roomId);

    expect(await abandon(database, room.roomId, room.zoeId)).toBe('abandoned');
    expect(await abandon(database, room.roomId, room.alexId)).toBe('abandoned');

    const settled = await readSettledRace(room.roomId);
    expect(settled.endedAt).toEqual(race!.startsAt);
    expect(await readRoomPhase(room.roomId)).toBe('results');
  });
});
