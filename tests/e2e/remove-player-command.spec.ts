import { expect } from '@playwright/test';
import type { GuestId } from '../../src/domain/guest-id';
import { passageLength } from '../../src/domain/passage';
import type { RoomId } from '../../src/domain/room-id';
import type { Database } from '../../src/server/db/types';
import { leaveRoom } from '../../src/server/rooms/leave-room';
import { prepareNextRace } from '../../src/server/rooms/prepare-next-race';
import { removePlayer, type RemovePlayerResult } from '../../src/server/rooms/remove-player';
import { reportProgress } from '../../src/server/rooms/report-progress';
import { findRoomSnapshot } from '../../src/server/rooms/room-snapshot';
import { commandTest as test, insertGuest, joinRoomNow, openRoomForNewHost } from './support/commands';
import { uniqueName, withTestDatabase } from './support/guests';
import { countMembersOf, readIdleState, readRoomPhase, readRoomRevision, setLobbyInactiveFor, setRoomPhase, startRaceInDatabase, testPassage } from './support/rooms';
import { readSettledRace } from './support/settlement';

type Room = { roomId: RoomId; alexId: GuestId; zoeId: GuestId; ninaId: GuestId };

const fullLength = passageLength(testPassage);
const inactiveRaceStartMs = -90_000;

async function waitingRoom(database: Database): Promise<Room> {
  const { roomId, hostId } = await openRoomForNewHost(database);
  const zoeId = await insertGuest(uniqueName('Zoe '));
  const ninaId = await insertGuest(uniqueName('Nina '));
  for (const guestId of [zoeId, ninaId]) await joinRoomNow(database, roomId, guestId);
  return { roomId, alexId: hostId, zoeId, ninaId };
}

async function racingRoom(database: Database, startsInMs = inactiveRaceStartMs): Promise<Room> {
  const room = await waitingRoom(database);
  await withTestDatabase((sql) => sql`insert into owned_pokemon (guest_id, dex, level, is_partner) select unnest(${[room.alexId, room.zoeId, room.ninaId]}::uuid[]), 4, 5, true`);
  await startRaceInDatabase(room.roomId, startsInMs);
  return room;
}

async function memberKeyOf(roomId: RoomId, guestId: GuestId): Promise<string> {
  const [member] = await withTestDatabase((sql) => sql`select id from room_members where room_id = ${roomId} and guest_id = ${guestId}`);
  return member!.id as string;
}

async function remove(database: Database, room: Room, target: GuestId, by = room.alexId, removedAt = new Date()): Promise<RemovePlayerResult> {
  return removePlayer(database, { roomId: room.roomId, guestId: by, memberKey: await memberKeyOf(room.roomId, target), removedAt });
}

async function startsAtOf(roomId: RoomId): Promise<Date> {
  const [race] = await withTestDatabase((sql) => sql`select starts_at from races where room_id = ${roomId} order by created_at desc limit 1`);
  return race!.starts_at as Date;
}

async function report(database: Database, room: Room, guestId: GuestId, position: number, reportedAt = new Date()) {
  return reportProgress(database, { roomId: room.roomId, guestId, report: { sequence: position, position, keystrokes: position, rejectedKeystrokes: 0 }, reportedAt });
}

async function finish(database: Database, room: Room, guestId: GuestId) {
  expect((await report(database, room, guestId, fullLength)).result).toBe('accepted');
}

test.describe('removing a player from the waiting room', () => {
  test('the host removes Zoe: she leaves the room, her page learns why, and she can join again', async ({ database }) => {
    const room = await waitingRoom(database);
    await setLobbyInactiveFor(room.roomId, 60_000);
    const revisionBefore = await readRoomRevision(room.roomId);
    const activityBefore = (await readIdleState(room.roomId)).lastActivityAt;

    expect(await remove(database, room, room.zoeId)).toBe('removed');
    expect(await countMembersOf(room.roomId)).toBe(2);
    expect(await readRoomRevision(room.roomId)).toBe(revisionBefore + 1);
    expect((await readIdleState(room.roomId)).lastActivityAt.getTime()).toBeGreaterThan(activityBefore.getTime());
    expect((await findRoomSnapshot(database, room.roomId, room.zoeId)).kind).toBe('removed-by-host');

    expect(await joinRoomNow(database, room.roomId, room.zoeId)).toBe('joined');
    expect((await findRoomSnapshot(database, room.roomId, room.zoeId)).kind).toBe('snapshot');
  });

  test('only the host removes, never themselves, and only a member of this room', async ({ database }) => {
    const room = await waitingRoom(database);
    const other = await waitingRoom(database);
    const stranger = await insertGuest(uniqueName('Léo '));
    const revisionBefore = await readRoomRevision(room.roomId);

    expect(await remove(database, room, room.ninaId, room.zoeId)).toBe('not-host');
    expect(await remove(database, room, room.alexId)).toBe('unknown-player');
    expect(await removePlayer(database, { roomId: room.roomId, guestId: room.alexId, memberKey: await memberKeyOf(other.roomId, other.zoeId), removedAt: new Date() })).toBe('unknown-player');
    expect(await removePlayer(database, { roomId: room.roomId, guestId: room.alexId, memberKey: 'not-a-key', removedAt: new Date() })).toBe('unknown-player');
    expect(await removePlayer(database, { roomId: room.roomId, guestId: stranger, memberKey: await memberKeyOf(room.roomId, room.zoeId), removedAt: new Date() })).toBe('not-member');
    expect(await countMembersOf(room.roomId)).toBe(3);
    expect(await readRoomRevision(room.roomId)).toBe(revisionBefore);
  });

  test('nobody is removed from the results', async ({ database }) => {
    const room = await waitingRoom(database);
    await setRoomPhase(room.roomId, 'results');

    expect(await remove(database, room, room.zoeId)).toBe('not-racing');
    expect(await countMembersOf(room.roomId)).toBe(3);
  });
});

test.describe('removing an inactive racer from the race', () => {
  test('refused while the racer had an accepted report within the last minute, allowed after it', async ({ database }) => {
    const room = await racingRoom(database);
    const startsAt = (await startsAtOf(room.roomId)).getTime();
    expect((await report(database, room, room.zoeId, 5, new Date(startsAt + 60_000))).result).toBe('accepted');

    expect(await remove(database, room, room.zoeId, room.alexId, new Date(startsAt + 119_999))).toBe('still-active');
    expect(await remove(database, room, room.zoeId, room.alexId, new Date(startsAt + 120_000))).toBe('marked-inactive');
  });

  test('a racer who never typed counts from the start, so the first minute protects them', async ({ database }) => {
    const room = await racingRoom(database, -30_000);

    expect(await remove(database, room, room.zoeId)).toBe('still-active');
  });

  test('the inactive racer stays in the room, cannot type any more and is listed after the ranked racers with nothing earned', async ({ database }) => {
    const room = await racingRoom(database);

    expect(await remove(database, room, room.zoeId)).toBe('marked-inactive');
    expect((await report(database, room, room.zoeId, 3)).result).toBe('inactive');
    expect(await remove(database, room, room.zoeId)).toBe('not-racing');
    await finish(database, room, room.alexId);
    await finish(database, room, room.ninaId);

    expect(await readRoomPhase(room.roomId)).toBe('results');
    expect(await countMembersOf(room.roomId)).toBe(3);
    const settled = await readSettledRace(room.roomId);
    expect(settled.results.find((result) => result.guestId === room.zoeId)).toMatchObject({ place: null, score: null });
    const found = await findRoomSnapshot(database, room.roomId, room.zoeId);
    const results = found.kind === 'snapshot' ? found.snapshot.race?.results : null;
    expect(results?.map((result) => result.standing).sort()).toEqual(['inactive', 'ranked', 'ranked']);
    const [rewards] = await withTestDatabase((sql) => sql`
      select (select xp from xp_grants where race_id = r.id and guest_id = ${room.zoeId}) as xp,
        (select amount from coin_entries where race_id = r.id and guest_id = ${room.zoeId} and reason = 'race') as coins,
        (select count(*)::int from wild_encounters where race_id = r.id and guest_id = ${room.zoeId}) as encounters
      from races r where r.room_id = ${room.roomId}`);
    expect(rewards).toEqual({ xp: 0, coins: 0, encounters: 0 });
  });

  test('removing the last racer still typing settles the race at once', async ({ database }) => {
    const room = await racingRoom(database);
    await finish(database, room, room.alexId);
    await finish(database, room, room.ninaId);

    expect(await remove(database, room, room.zoeId)).toBe('marked-inactive');
    expect(await readRoomPhase(room.roomId)).toBe('results');
  });

  test('preparing the next race keeps the inactive racer and removes the abandoner', async ({ database }) => {
    const room = await racingRoom(database);
    expect(await remove(database, room, room.zoeId)).toBe('marked-inactive');
    expect(await leaveRoom(database, { roomId: room.roomId, guestId: room.ninaId, leftAt: new Date() })).toBe('left');
    await finish(database, room, room.alexId);

    expect(await prepareNextRace(database, { roomId: room.roomId, guestId: room.alexId, preparedAt: new Date() })).toBe('prepared');
    const members = await withTestDatabase((sql) => sql`select guest_id from room_members where room_id = ${room.roomId}`);
    expect(members.map((member) => member.guest_id).sort()).toEqual([room.alexId, room.zoeId].sort());
  });

  test('an inactive racer who leaves becomes an abandoner, so the next race preparation takes them out', async ({ database }) => {
    const room = await racingRoom(database);
    expect(await remove(database, room, room.zoeId)).toBe('marked-inactive');

    expect(await leaveRoom(database, { roomId: room.roomId, guestId: room.zoeId, leftAt: new Date() })).toBe('left');
    await finish(database, room, room.alexId);
    await finish(database, room, room.ninaId);
    expect(await prepareNextRace(database, { roomId: room.roomId, guestId: room.alexId, preparedAt: new Date() })).toBe('prepared');
    expect(await countMembersOf(room.roomId)).toBe(2);
  });
});
