import { test as base, expect } from '@playwright/test';
import { eq } from 'drizzle-orm';
import { gameConfig } from '../../src/config/game';
import type { GuestId } from '../../src/domain/guest-id';
import type { RoomId } from '../../src/domain/room-id';
import * as schema from '../../src/server/db/schema';
import type { Database } from '../../src/server/db/types';
import { leaveRoom } from '../../src/server/rooms/leave-room';
import { loadRoomSnapshot, type LoadedRoomSnapshot } from '../../src/server/rooms/load-room-snapshot';
import { findPublicRooms } from '../../src/server/rooms/public-rooms';
import { joinRoom, openRoom } from '../../src/server/rooms/room-commands';
import { placeInPublicRoom } from '../../src/server/rooms/room-placement';
import { startRace } from '../../src/server/rooms/start-race';
import { commandTest, insertGuest, joinRoomNow, openRoomForNewHost, whileHoldingRoomRow } from './support/commands';
import { uniqueName } from './support/guests';
import { createIsolatedDatabase, insertGuestInto, type IsolatedDatabase } from './support/isolated-database';
import { readIdleState, readRoomRevision, setRoomPhase } from './support/rooms';

const { idleAfterMs, closeAfterMs } = gameConfig.rooms;

type Lobby = { roomId: RoomId; alexId: GuestId; zoeId: GuestId; lastActivityAt: Date };

async function lobbyOfTwo(database: Database): Promise<Lobby> {
  const { roomId, hostId } = await openRoomForNewHost(database);
  const zoeId = await insertGuest(uniqueName('Zoe '));
  await joinRoomNow(database, roomId, zoeId);
  return { roomId, alexId: hostId, zoeId, lastActivityAt: (await readIdleState(roomId)).lastActivityAt };
}

function inactiveFor(lobby: Lobby, inactiveMs: number): Date {
  return new Date(lobby.lastActivityAt.getTime() + inactiveMs);
}

function snapshotOf({ found }: LoadedRoomSnapshot) {
  return found.kind === 'snapshot' ? found.snapshot : null;
}

commandTest.describe('the lobby idle clock', () => {
  commandTest('a real join restarts the idle clock, so Nina opening the link of an idle room revives it', async ({ database }) => {
    const lobby = await lobbyOfTwo(database);
    const ninaId = await insertGuest(uniqueName('Nina '));
    const joinedAt = inactiveFor(lobby, idleAfterMs + 60_000);

    expect(await joinRoom(database, { roomId: lobby.roomId, guestId: ninaId, joinedAt })).toBe('joined');

    expect((await readIdleState(lobby.roomId)).lastActivityAt).toEqual(joinedAt);
  });

  commandTest('Zoe re-entering the room she is already in does not count as activity', async ({ database }) => {
    const lobby = await lobbyOfTwo(database);

    expect(await joinRoom(database, { roomId: lobby.roomId, guestId: lobby.zoeId, joinedAt: inactiveFor(lobby, 60_000) })).toBe('already-member');

    expect((await readIdleState(lobby.roomId)).lastActivityAt).toEqual(lobby.lastActivityAt);
  });

  commandTest('Zoe leaving the waiting room restarts the idle clock', async ({ database }) => {
    const lobby = await lobbyOfTwo(database);
    const leftAt = inactiveFor(lobby, 4 * 60_000);

    expect(await leaveRoom(database, { roomId: lobby.roomId, guestId: lobby.zoeId, leftAt })).toBe('left');

    expect((await readIdleState(lobby.roomId)).lastActivityAt).toEqual(leftAt);
  });

  commandTest('the snapshot of a waiting room carries its idle and close times on the server clock, a race never does', async ({ database }) => {
    const lobby = await lobbyOfTwo(database);
    const activityMs = lobby.lastActivityAt.getTime();

    const waiting = snapshotOf(await loadRoomSnapshot(database, lobby.roomId, lobby.zoeId, inactiveFor(lobby, 0)));
    expect(waiting?.lobbyIdle).toEqual({ idleAt: activityMs + idleAfterMs, closesAt: activityMs + closeAfterMs });

    await setRoomPhase(lobby.roomId, 'countdown');
    expect(snapshotOf(await loadRoomSnapshot(database, lobby.roomId, lobby.zoeId, new Date()))?.lobbyIdle).toBeNull();
  });
});

commandTest.describe('closing a lobby idle for 10 minutes', () => {
  commandTest('one millisecond before the close time the room stays open and nothing is written', async ({ database }) => {
    const lobby = await lobbyOfTwo(database);
    const revisionBefore = await readRoomRevision(lobby.roomId);

    const loaded = await loadRoomSnapshot(database, lobby.roomId, lobby.zoeId, inactiveFor(lobby, closeAfterMs - 1));

    expect(loaded.hasChangedRoom).toBe(false);
    expect(snapshotOf(loaded)?.phase).toBe('waiting');
    expect(await readRoomRevision(lobby.roomId)).toBe(revisionBefore);
  });

  commandTest('at the close time, three members reading at once close the room exactly once, for inactivity', async ({ database }) => {
    const lobby = await lobbyOfTwo(database);
    const revisionBefore = await readRoomRevision(lobby.roomId);
    const closeTime = inactiveFor(lobby, closeAfterMs);
    const reads: Promise<LoadedRoomSnapshot>[] = [];

    await whileHoldingRoomRow(lobby.roomId, async (waitForQueuedCommands) => {
      reads.push(...[lobby.alexId, lobby.zoeId, lobby.zoeId].map((guestId) => loadRoomSnapshot(database, lobby.roomId, guestId, closeTime)));
      await waitForQueuedCommands(3);
    });
    const loaded = await Promise.all(reads);

    expect(loaded.filter(({ hasChangedRoom }) => hasChangedRoom)).toHaveLength(1);
    expect(loaded.map(({ found }) => found.kind)).toEqual(['closed-idle', 'closed-idle', 'closed-idle']);
    expect(await readRoomRevision(lobby.roomId)).toBe(revisionBefore + 1);
    expect(await readIdleState(lobby.roomId)).toMatchObject({ phase: 'closed', closeReason: 'idle' });
  });

  commandTest('a room closed for inactivity is told apart only to its members; a host who left still reads as not found', async ({ database }) => {
    const idle = await lobbyOfTwo(database);
    await loadRoomSnapshot(database, idle.roomId, idle.zoeId, inactiveFor(idle, closeAfterMs));
    const stranger = await insertGuest(uniqueName('Nina '));
    const hostLeft = await lobbyOfTwo(database);
    await leaveRoom(database, { roomId: hostLeft.roomId, guestId: hostLeft.alexId, leftAt: new Date() });

    expect((await loadRoomSnapshot(database, idle.roomId, stranger, new Date())).found.kind).toBe('not-found');
    expect((await loadRoomSnapshot(database, hostLeft.roomId, hostLeft.zoeId, new Date())).found.kind).toBe('not-found');
    expect((await readIdleState(hostLeft.roomId)).closeReason).toBe('host-left');
  });

  commandTest('joining, starting or leaving a room past its close time closes it instead of reviving it', async ({ database }) => {
    const joined = await lobbyOfTwo(database);
    const started = await lobbyOfTwo(database);
    const left = await lobbyOfTwo(database);
    const ninaId = await insertGuest(uniqueName('Nina '));

    expect(await joinRoom(database, { roomId: joined.roomId, guestId: ninaId, joinedAt: inactiveFor(joined, closeAfterMs) })).toBe('not-found');
    expect(await startRace(database, { roomId: started.roomId, guestId: started.alexId, requestedAt: inactiveFor(started, closeAfterMs) })).toBe('not-found');
    expect(await leaveRoom(database, { roomId: left.roomId, guestId: left.zoeId, leftAt: inactiveFor(left, closeAfterMs) })).toBe('closed');

    for (const { roomId } of [joined, started, left]) expect(await readIdleState(roomId)).toMatchObject({ phase: 'closed', closeReason: 'idle' });
  });

  commandTest('racing and the results never count as inactivity: 20 minutes after the last join the room is still open', async ({ database }) => {
    const racing = await lobbyOfTwo(database);
    const settled = await lobbyOfTwo(database);
    await setRoomPhase(racing.roomId, 'countdown', 60 * 60_000);
    await setRoomPhase(settled.roomId, 'results');

    expect((await loadRoomSnapshot(database, racing.roomId, racing.zoeId, inactiveFor(racing, 20 * 60_000))).hasChangedRoom).toBe(false);
    expect((await loadRoomSnapshot(database, settled.roomId, settled.zoeId, inactiveFor(settled, 20 * 60_000))).hasChangedRoom).toBe(false);
    expect((await readIdleState(racing.roomId)).phase).toBe('countdown');
    expect((await readIdleState(settled.roomId)).phase).toBe('results');
  });
});

const isolatedTest = base.extend<{ isolated: IsolatedDatabase }>({
  isolated: async ({}, provide) => {
    const isolated = await createIsolatedDatabase();
    await provide(isolated);
    await isolated.drop();
  },
});

const now = new Date();

async function openRoomInactiveFor(database: Database, inactiveMs: number): Promise<RoomId> {
  const roomId = await openRoom(database, { hostGuestId: await insertGuestInto(database, uniqueName('Hôte ')), visibility: 'public', openedAt: now });
  await database.update(schema.rooms).set({ lastActivityAt: new Date(now.getTime() - inactiveMs) }).where(eq(schema.rooms.id, roomId));
  return roomId;
}

isolatedTest.describe('hiding a lobby idle for 5 minutes', () => {
  isolatedTest('the public list shows a room idle for 4 min 59 s and hides one idle for 5 minutes', async ({ isolated: { database } }) => {
    const active = await openRoomInactiveFor(database, idleAfterMs - 1_000);
    await openRoomInactiveFor(database, idleAfterMs);

    expect((await findPublicRooms(database, gameConfig.publicRooms.listLimit, now)).map(({ roomId }) => roomId)).toEqual([active]);
  });

  isolatedTest('"Faire une course" never places Zoe in an idle room: with only idle rooms it creates one', async ({ isolated: { database } }) => {
    const idle = await openRoomInactiveFor(database, idleAfterMs + 60_000);
    const zoe = await insertGuestInto(database, uniqueName('Zoe '));

    const placement = await placeInPublicRoom(database, zoe, now);

    expect(placement.result).toBe('created');
    expect(placement.roomId).not.toBe(idle);
  });
});
