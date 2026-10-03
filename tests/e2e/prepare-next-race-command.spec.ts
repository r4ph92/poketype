import { expect } from '@playwright/test';
import type { GuestId } from '../../src/domain/guest-id';
import type { RaceId } from '../../src/domain/race';
import type { RoomId } from '../../src/domain/room-id';
import type { Database } from '../../src/server/db/types';
import { abandonRace } from '../../src/server/rooms/abandon-race';
import { leaveRoom } from '../../src/server/rooms/leave-room';
import { findPastRaceResults } from '../../src/server/rooms/past-race-results';
import { prepareNextRace, type PrepareNextRaceResult } from '../../src/server/rooms/prepare-next-race';
import { findPublicRooms } from '../../src/server/rooms/public-rooms';
import { openRoom } from '../../src/server/rooms/room-commands';
import { findRoomSnapshot } from '../../src/server/rooms/room-snapshot';
import { startRace } from '../../src/server/rooms/start-race';
import { commandTest as test, insertGuest, joinRoomNow } from './support/commands';
import { uniqueName } from './support/guests';
import { countMembersOf, readIdleState, readParticipants, readRoomAccess, readRoomPhase, readRoomRaces, readRoomRevision, setRoomPhase, startRaceInDatabase } from './support/rooms';
import { finishRaceInDatabase, readSettledRaceById } from './support/settlement';

type Racer = { id: GuestId; name: string };

type Room = { roomId: RoomId; alex: Racer; zoe: Racer; nina: Racer };

const unknownRoomId = '00000000-0000-4000-8000-000000000000' as RoomId;

async function newRacer(prefix: string): Promise<Racer> {
  const name = uniqueName(prefix);
  return { id: await insertGuest(name), name };
}

async function waitingRoomOfThree(database: Database): Promise<Room> {
  const alex = await newRacer('Alex ');
  const roomId = await openRoom(database, { hostGuestId: alex.id, visibility: 'public', openedAt: new Date() });
  const zoe = await newRacer('Zoe ');
  const nina = await newRacer('Nina ');
  for (const racer of [zoe, nina]) await joinRoomNow(database, roomId, racer.id);
  return { roomId, alex, zoe, nina };
}

// Zoe abandons, Alex and Nina finish: the room shows the settled results.
async function roomShowingResults(database: Database): Promise<Room> {
  const room = await waitingRoomOfThree(database);
  await startRaceInDatabase(room.roomId, -90_000);
  expect(await abandonRace(database, { roomId: room.roomId, guestId: room.zoe.id, abandonedAt: new Date() })).toBe('abandoned');
  await finishRaceInDatabase(room.roomId, [
    { trainerName: room.alex.name, elapsedMs: 30_000, rejectedKeystrokes: 0 },
    { trainerName: room.nina.name, elapsedMs: 40_000, rejectedKeystrokes: 2 },
  ]);
  expect(await readRoomPhase(room.roomId)).toBe('results');
  return room;
}

function prepare(database: Database, roomId: RoomId, guestId: GuestId, preparedAt = new Date()): Promise<PrepareNextRaceResult> {
  return prepareNextRace(database, { roomId, guestId, preparedAt });
}

async function firstRaceId(roomId: RoomId): Promise<RaceId> {
  const [race] = await readRoomRaces(roomId);
  return race!.id as RaceId;
}

test.describe('preparing the next race', () => {
  test('the host brings the room back to waiting with its code and visibility, restarts the idle clock and lists it again', async ({ database }) => {
    const room = await roomShowingResults(database);
    const accessBefore = await readRoomAccess(room.roomId);
    const revisionBefore = await readRoomRevision(room.roomId);
    const preparedAt = new Date();

    expect(await prepare(database, room.roomId, room.alex.id, preparedAt)).toBe('prepared');

    expect(await readIdleState(room.roomId)).toMatchObject({ phase: 'waiting', lastActivityAt: preparedAt, closeReason: null });
    expect(await readRoomAccess(room.roomId)).toEqual(accessBefore);
    expect(await readRoomRevision(room.roomId)).toBe(revisionBefore + 1);
    const listed = await findPublicRooms(database, 1000, new Date());
    expect(listed.some((listedRoom) => listedRoom.roomId === room.roomId)).toBe(true);
  });

  test('Zoe, who is not the host, is refused and nothing changes', async ({ database }) => {
    const room = await roomShowingResults(database);
    const revisionBefore = await readRoomRevision(room.roomId);

    expect(await prepare(database, room.roomId, room.nina.id)).toBe('not-host');
    expect(await prepare(database, room.roomId, (await newRacer('Max ')).id)).toBe('not-member');
    expect(await prepare(database, unknownRoomId, room.alex.id)).toBe('not-found');

    expect(await readRoomPhase(room.roomId)).toBe('results');
    expect(await readRoomRevision(room.roomId)).toBe(revisionBefore);
    expect(await countMembersOf(room.roomId)).toBe(3);
  });

  test('a prepare outside the results is refused: not from the lobby, not during a race', async ({ database }) => {
    const room = await waitingRoomOfThree(database);
    expect(await prepare(database, room.roomId, room.alex.id)).toBe('not-results');

    await setRoomPhase(room.roomId, 'countdown');
    const revisionBefore = await readRoomRevision(room.roomId);
    expect(await prepare(database, room.roomId, room.alex.id)).toBe('not-results');
    expect(await readRoomPhase(room.roomId)).toBe('countdown');
    expect(await readRoomRevision(room.roomId)).toBe(revisionBefore);
  });

  test('the abandoner leaves the room with the race while the others stay, and their snapshot says why', async ({ database }) => {
    const room = await roomShowingResults(database);
    const stranger = await newRacer('Max ');

    await prepare(database, room.roomId, room.alex.id);

    expect(await countMembersOf(room.roomId)).toBe(2);
    expect((await findRoomSnapshot(database, room.roomId, room.nina.id)).kind).toBe('snapshot');
    expect((await findRoomSnapshot(database, room.roomId, room.zoe.id)).kind).toBe('removed-abandoner');
    expect((await findRoomSnapshot(database, room.roomId, stranger.id)).kind).toBe('not-member');
    expect(await joinRoomNow(database, room.roomId, room.zoe.id)).toBe('joined');
  });

  test('a host who abandoned stays the host of the prepared room', async ({ database }) => {
    const room = await waitingRoomOfThree(database);
    await startRaceInDatabase(room.roomId, -90_000);
    await abandonRace(database, { roomId: room.roomId, guestId: room.alex.id, abandonedAt: new Date() });
    await finishRaceInDatabase(room.roomId, [room.zoe, room.nina].map(({ name }) => ({ trainerName: name, elapsedMs: 30_000, rejectedKeystrokes: 0 })));

    expect(await prepare(database, room.roomId, room.alex.id)).toBe('prepared');

    expect(await countMembersOf(room.roomId)).toBe(3);
  });

  test('the second race gets a new passage and the first race keeps its settled results', async ({ database }) => {
    const room = await roomShowingResults(database);
    const raceId = await firstRaceId(room.roomId);
    const firstResults = await readSettledRaceById(raceId);
    await prepare(database, room.roomId, room.alex.id);

    expect(await startRace(database, { roomId: room.roomId, guestId: room.alex.id, requestedAt: new Date() })).toBe('started');

    const [firstRace, secondRace] = await readRoomRaces(room.roomId);
    expect(secondRace!.passage).not.toBe(firstRace!.passage);
    expect(await readSettledRaceById(raceId)).toEqual(firstResults);
  });

  test('Nina, who left after the first results, is not in the second race', async ({ database }) => {
    const room = await roomShowingResults(database);
    expect(await leaveRoom(database, { roomId: room.roomId, guestId: room.nina.id, leftAt: new Date() })).toBe('left');
    await prepare(database, room.roomId, room.alex.id);
    expect(await joinRoomNow(database, room.roomId, room.zoe.id)).toBe('joined');

    await startRace(database, { roomId: room.roomId, guestId: room.alex.id, requestedAt: new Date() });

    expect((await readParticipants(room.roomId)).map(({ guestId }) => guestId).sort()).toEqual([room.alex.id, room.zoe.id].sort());
  });
});

test.describe('reading a past race', () => {
  test('every participant of the race, the removed abandoner included, reads its settled results', async ({ database }) => {
    const room = await roomShowingResults(database);
    const raceId = await firstRaceId(room.roomId);
    await prepare(database, room.roomId, room.alex.id);

    const read = await findPastRaceResults(database, { roomId: room.roomId, raceId, viewerGuestId: room.zoe.id });

    expect(read!.racers.map(({ trainerName }) => trainerName).sort()).toEqual([room.alex.name, room.nina.name, room.zoe.name].sort());
    expect(read!.racers.find(({ isViewer }) => isViewer)!.trainerName).toBe(room.zoe.name);
    expect(read!.results.filter((result) => result.standing === 'abandoned')).toHaveLength(1);
    expect(read!.results.map((result) => (result.standing === 'ranked' ? result.place : null)).sort()).toEqual([1, 2, null]);
    expect(JSON.stringify(read)).not.toContain(room.zoe.id);
  });

  test('anyone outside the race reads nothing, nor a race through another room, nor a race still running', async ({ database }) => {
    const room = await roomShowingResults(database);
    const raceId = await firstRaceId(room.roomId);
    const other = await waitingRoomOfThree(database);
    const stranger = await newRacer('Max ');
    await startRaceInDatabase(other.roomId, -10_000);

    expect(await findPastRaceResults(database, { roomId: room.roomId, raceId, viewerGuestId: stranger.id })).toBeNull();
    expect(await findPastRaceResults(database, { roomId: other.roomId, raceId, viewerGuestId: room.alex.id })).toBeNull();
    expect(await findPastRaceResults(database, { roomId: other.roomId, raceId: await firstRaceId(other.roomId), viewerGuestId: other.alex.id })).toBeNull();
  });
});
