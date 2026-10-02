import { test as base, expect } from '@playwright/test';
import { gameConfig } from '../../src/config/game';
import { roomCodePattern } from '../../src/domain/room-code';
import type { GuestId } from '../../src/domain/guest-id';
import type { RoomId } from '../../src/domain/room-id';
import type { Database } from '../../src/server/db/types';
import { changeRoomVisibility } from '../../src/server/rooms/change-room-visibility';
import { joinRoomByCode, type CodeJoin } from '../../src/server/rooms/join-room-by-code';
import { findPublicRooms } from '../../src/server/rooms/public-rooms';
import { openRoom } from '../../src/server/rooms/room-commands';
import { placeInPublicRoom } from '../../src/server/rooms/room-placement';
import { commandTest as test, insertGuest, joinRoomNow, openRoomForNewHost } from './support/commands';
import { uniqueName } from './support/guests';
import { createIsolatedDatabase, insertGuestInto, type IsolatedDatabase } from './support/isolated-database';
import {
  countMembersOf,
  countRoomCodeFailures,
  fillRoomTo,
  insertRoomCodeFailures,
  readIdleState,
  readRoomAccess,
  readRoomCode,
  readRoomRevision,
  setLobbyInactiveFor,
  setRoomPhase,
} from './support/rooms';

const { maxFailures } = gameConfig.rooms.codeThrottle;

function joinByCode(database: Database, guestId: GuestId, typedCode: string): Promise<CodeJoin> {
  return joinRoomByCode(database, { typedCode, guestId, joinedAt: new Date() });
}

const newGuest = () => insertGuest(uniqueName('Zoé '));

// Drawn from the alphabet, and never stored: the database check refuses any code outside it.
const codeNoRoomHas = 'ZZZZZ2';

test.describe('room codes', () => {
  test('every new room gets its own 6-character code without O, 0, I or 1', async ({ database }) => {
    const rooms = await Promise.all(Array.from({ length: 20 }, () => openRoomForNewHost(database)));
    const codes = await Promise.all(rooms.map(({ roomId }) => readRoomCode(roomId)));

    for (const code of codes) expect(code).toMatch(roomCodePattern);
    expect(codes.join('')).not.toMatch(/[O0I1]/);
    expect(new Set(codes).size).toBe(codes.length);
  });

  test('a room is public unless it is opened unlisted', async ({ database }) => {
    const { roomId: publicRoom } = await openRoomForNewHost(database);
    const { roomId: unlistedRoom } = await openRoomForNewHost(database, 'unlisted');

    expect((await readRoomAccess(publicRoom)).visibility).toBe('public');
    expect((await readRoomAccess(unlistedRoom)).visibility).toBe('unlisted');
  });
});

test.describe('joining with a code', () => {
  test('Zoe joins with the code typed in lower case and with spaces, once', async ({ database }) => {
    const { roomId } = await openRoomForNewHost(database, 'unlisted');
    const code = await readRoomCode(roomId);
    const zoe = await newGuest();
    const typed = ` ${code.slice(0, 3).toLowerCase()} ${code.slice(3).toLowerCase()} `;

    expect(await joinByCode(database, zoe, typed)).toEqual({ outcome: 'joined', roomId });
    expect(await joinByCode(database, zoe, code)).toEqual({ outcome: 'already-member', roomId });
    expect(await countMembersOf(roomId)).toBe(2);
    expect(await countRoomCodeFailures(zoe)).toBe(0);
  });

  test('an unknown code and the code of a closed room get the same answer, join nothing and count as failures', async ({ database }) => {
    const { roomId } = await openRoomForNewHost(database);
    await setRoomPhase(roomId, 'closed');
    const zoe = await newGuest();

    expect(await joinByCode(database, zoe, codeNoRoomHas)).toEqual({ outcome: 'unknown' });
    expect(await joinByCode(database, zoe, await readRoomCode(roomId))).toEqual({ outcome: 'unknown' });
    expect(await countMembersOf(roomId)).toBe(1);
    expect(await countRoomCodeFailures(zoe)).toBe(2);
  });

  test('a malformed code is unknown without counting as a failure, since it can name no room', async ({ database }) => {
    const zoe = await newGuest();

    for (const typed of ['', 'K7M2Q', 'K7M2QXA', 'K7M2Q0', 'x'.repeat(500)]) {
      expect(await joinByCode(database, zoe, typed)).toEqual({ outcome: 'unknown' });
    }
    expect(await countRoomCodeFailures(zoe)).toBe(0);
  });

  test('the code of a room whose race started is refused, but its members still get back in', async ({ database }) => {
    const { roomId } = await openRoomForNewHost(database);
    const zoe = await newGuest();
    await joinRoomNow(database, roomId, zoe);
    await setRoomPhase(roomId, 'countdown');
    const code = await readRoomCode(roomId);

    expect(await joinByCode(database, await newGuest(), code)).toEqual({ outcome: 'race-started' });
    expect(await joinByCode(database, zoe, code)).toEqual({ outcome: 'already-member', roomId });
    expect(await countMembersOf(roomId)).toBe(2);
  });

  test('the code of a full room is refused', async ({ database }) => {
    const { roomId } = await openRoomForNewHost(database, 'unlisted');
    await fillRoomTo(roomId, gameConfig.rooms.capacity);

    expect(await joinByCode(database, await newGuest(), await readRoomCode(roomId))).toEqual({ outcome: 'full' });
    expect(await countMembersOf(roomId)).toBe(gameConfig.rooms.capacity);
  });

  test('the code of a room past its idle close time is unknown', async ({ database }) => {
    const { roomId } = await openRoomForNewHost(database);
    await setLobbyInactiveFor(roomId, gameConfig.rooms.closeAfterMs + 1_000);

    expect(await joinByCode(database, await newGuest(), await readRoomCode(roomId))).toEqual({ outcome: 'unknown' });
    expect((await readIdleState(roomId)).closeReason).toBe('idle');
  });
});

test.describe('the code throttle', () => {
  test('after 10 unknown codes within a minute, even a valid code is refused, and the refusal is not counted', async ({ database }) => {
    const { roomId } = await openRoomForNewHost(database, 'unlisted');
    const zoe = await newGuest();
    await insertRoomCodeFailures(zoe, maxFailures);

    expect(await joinByCode(database, zoe, await readRoomCode(roomId))).toEqual({ outcome: 'throttled' });
    expect(await joinByCode(database, zoe, codeNoRoomHas)).toEqual({ outcome: 'throttled' });
    expect(await countMembersOf(roomId)).toBe(1);
    expect(await countRoomCodeFailures(zoe)).toBe(maxFailures);
  });

  test('12 wrong codes sent at once give 10 "unknown" and 2 "throttled"', async ({ database }) => {
    const zoe = await newGuest();

    const outcomes = await Promise.all(Array.from({ length: maxFailures + 2 }, () => joinByCode(database, zoe, codeNoRoomHas)));

    expect(outcomes.filter(({ outcome }) => outcome === 'unknown')).toHaveLength(maxFailures);
    expect(outcomes.filter(({ outcome }) => outcome === 'throttled')).toHaveLength(2);
  });

  test('9 failures leave the door open, and a minute after the latest failure the code works again', async ({ database }) => {
    const { roomId } = await openRoomForNewHost(database);
    const code = await readRoomCode(roomId);
    const zoe = await newGuest();
    const nina = await newGuest();
    await insertRoomCodeFailures(zoe, maxFailures - 1);
    await insertRoomCodeFailures(nina, maxFailures, 61);

    expect(await joinByCode(database, zoe, code)).toEqual({ outcome: 'joined', roomId });
    expect(await joinByCode(database, nina, code)).toEqual({ outcome: 'joined', roomId });
  });

  test('a locked session does not lock anyone else', async ({ database }) => {
    const { roomId } = await openRoomForNewHost(database);
    const zoe = await newGuest();
    await insertRoomCodeFailures(zoe, maxFailures);

    expect(await joinByCode(database, await newGuest(), await readRoomCode(roomId))).toEqual({ outcome: 'joined', roomId });
  });
});

test.describe('switching a room between public and unlisted', () => {
  const switchNow = (database: Database, roomId: RoomId, guestId: GuestId, visibility: 'public' | 'unlisted') =>
    changeRoomVisibility(database, { roomId, guestId, visibility, changedAt: new Date() });

  test('the host switches the waiting room: one revision bump, and the idle clock restarts', async ({ database }) => {
    const { roomId, hostId } = await openRoomForNewHost(database);
    await setLobbyInactiveFor(roomId, gameConfig.rooms.idleAfterMs + 1_000);
    const revisionBefore = await readRoomRevision(roomId);

    expect(await switchNow(database, roomId, hostId, 'unlisted')).toBe('changed');
    expect(await switchNow(database, roomId, hostId, 'unlisted')).toBe('unchanged');

    expect((await readRoomAccess(roomId)).visibility).toBe('unlisted');
    expect(await readRoomRevision(roomId)).toBe(revisionBefore + 1);
    expect(Date.now() - (await readIdleState(roomId)).lastActivityAt.getTime()).toBeLessThan(5_000);
    expect(await switchNow(database, roomId, hostId, 'public')).toBe('changed');
  });

  test('only the host can switch: a member and an outsider are refused and nothing changes', async ({ database }) => {
    const { roomId } = await openRoomForNewHost(database);
    const zoe = await newGuest();
    await joinRoomNow(database, roomId, zoe);
    const revisionBefore = await readRoomRevision(roomId);

    expect(await switchNow(database, roomId, zoe, 'unlisted')).toBe('not-host');
    expect(await switchNow(database, roomId, await newGuest(), 'unlisted')).toBe('not-member');
    expect((await readRoomAccess(roomId)).visibility).toBe('public');
    expect(await readRoomRevision(roomId)).toBe(revisionBefore);
  });

  test('once the race has started, or the room has closed, the switch is refused', async ({ database }) => {
    const racing = await openRoomForNewHost(database);
    await setRoomPhase(racing.roomId, 'countdown');
    const closed = await openRoomForNewHost(database);
    await setRoomPhase(closed.roomId, 'closed');

    expect(await switchNow(database, racing.roomId, racing.hostId, 'unlisted')).toBe('race-started');
    expect(await switchNow(database, closed.roomId, closed.hostId, 'unlisted')).toBe('not-found');
  });
});

const isolatedTest = base.extend<{ isolated: IsolatedDatabase }>({
  isolated: async ({}, provide) => {
    const isolated = await createIsolatedDatabase();
    await provide(isolated);
    await isolated.drop();
  },
});

isolatedTest.describe('unlisted rooms stay out of the public list and the placement', () => {
  isolatedTest('an unlisted waiting room is never listed nor offered, and Zoe gets a room of her own', async ({ isolated: { database } }) => {
    const unlisted = await openRoom(database, { hostGuestId: await insertGuestInto(database, uniqueName('Alex ')), visibility: 'unlisted', openedAt: new Date() });
    const zoe = await insertGuestInto(database, uniqueName('Zoé '));

    expect(await findPublicRooms(database, gameConfig.publicRooms.listLimit, new Date())).toEqual([]);
    const placement = await placeInPublicRoom(database, { guestId: zoe, placedAt: new Date() });

    expect(placement.result).toBe('created');
    expect(placement.roomId).not.toBe(unlisted);
  });

  isolatedTest('switching the room back to public lists it again', async ({ isolated: { database } }) => {
    const hostId = await insertGuestInto(database, uniqueName('Alex '));
    const roomId = await openRoom(database, { hostGuestId: hostId, visibility: 'unlisted', openedAt: new Date() });

    await changeRoomVisibility(database, { roomId, guestId: hostId, visibility: 'public', changedAt: new Date() });

    expect((await findPublicRooms(database, gameConfig.publicRooms.listLimit, new Date())).map((room) => room.roomId)).toEqual([roomId]);
  });
});
