import { test as base, expect } from '@playwright/test';
import { eq, sql } from 'drizzle-orm';
import { gameConfig } from '../../src/config/game';
import type { RoomId } from '../../src/domain/room-id';
import type { RoomPhase } from '../../src/domain/room-phase';
import * as schema from '../../src/server/db/schema';
import type { Database } from '../../src/server/db/types';
import { banGuest } from '../../src/server/rooms/room-bans';
import { joinAvailablePublicRoom, type Placement } from '../../src/server/rooms/room-placement';
import { whileHoldingRoomRow, openRoomNow } from './support/commands';
import { uniqueName } from './support/guests';
import { createIsolatedDatabase, insertGuestInto, type IsolatedDatabase } from './support/isolated-database';

const test = base.extend<{ isolated: IsolatedDatabase }>({
  isolated: async ({}, provide) => {
    const isolated = await createIsolatedDatabase();
    await provide(isolated);
    await isolated.drop();
  },
});

type RoomSetup = { players: number; minutesAgo: number; phase?: RoomPhase };

async function openRoomWith(database: Database, { players, minutesAgo, phase = 'waiting' }: RoomSetup): Promise<RoomId> {
  const roomId = await openRoomNow(database, { hostGuestId: await insertGuestInto(database, uniqueName('Hôte ')), visibility: 'public', openedAt: new Date() });
  for (let seat = 1; seat < players; seat++) {
    await database.insert(schema.roomMembers).values({ roomId, guestId: await insertGuestInto(database, uniqueName('Joueur ')) });
  }
  const createdAt = sql`now() - make_interval(mins => ${minutesAgo})`;
  await database.update(schema.rooms).set({ phase, createdAt }).where(eq(schema.rooms.id, roomId));
  return roomId;
}

async function countMembers(database: Database, roomId: RoomId): Promise<number> {
  return database.$count(schema.roomMembers, eq(schema.roomMembers.roomId, roomId));
}

test.describe('placing a player in a public room ("Faire une course")', () => {
  test('skips a room that banned the player and places them in the next one', async ({ isolated: { database } }) => {
    await openRoomWith(database, { players: 1, minutesAgo: 3 });
    const banning = await openRoomWith(database, { players: 3, minutesAgo: 2 });
    const zoe = await insertGuestInto(database, uniqueName('Zoe '));
    await database.transaction((transaction) => banGuest(transaction, banning, zoe, new Date()));

    const placement = await joinAvailablePublicRoom(database, { guestId: zoe, placedAt: new Date() });

    expect(placement?.result).toBe('joined');
    expect(placement?.roomId).not.toBe(banning);
    expect(await countMembers(database, banning)).toBe(3);
  });

  test('joins the fullest waiting room: rooms with 1, 3 and 2 players place Zoe in the room with 3', async ({ isolated: { database } }) => {
    await openRoomWith(database, { players: 1, minutesAgo: 3 });
    const fullest = await openRoomWith(database, { players: 3, minutesAgo: 2 });
    await openRoomWith(database, { players: 2, minutesAgo: 1 });
    const zoe = await insertGuestInto(database, uniqueName('Zoe '));

    expect(await joinAvailablePublicRoom(database, { guestId: zoe, placedAt: new Date() })).toEqual({ roomId: fullest, result: 'joined' });
    expect(await countMembers(database, fullest)).toBe(4);
  });

  test('between two rooms with the same number of players, joins the one created first', async ({ isolated: { database } }) => {
    await openRoomWith(database, { players: 2, minutesAgo: 1 });
    const older = await openRoomWith(database, { players: 2, minutesAgo: 5 });
    const zoe = await insertGuestInto(database, uniqueName('Zoe '));

    expect(await joinAvailablePublicRoom(database, { guestId: zoe, placedAt: new Date() })).toEqual({ roomId: older, result: 'joined' });
  });

  test('with no room at all, places nobody and creates nothing', async ({ isolated: { database } }) => {
    const zoe = await insertGuestInto(database, uniqueName('Zoe '));

    expect(await joinAvailablePublicRoom(database, { guestId: zoe, placedAt: new Date() })).toBeNull();
    expect(await database.$count(schema.rooms)).toBe(0);
  });

  test('skips full, racing and closed rooms, and creates no room when none is eligible', async ({ isolated: { database } }) => {
    const ineligible = [
      await openRoomWith(database, { players: gameConfig.rooms.capacity.default, minutesAgo: 4 }),
      await openRoomWith(database, { players: 5, minutesAgo: 3, phase: 'countdown' }),
      await openRoomWith(database, { players: 4, minutesAgo: 2, phase: 'racing' }),
      await openRoomWith(database, { players: 3, minutesAgo: 1, phase: 'closed' }),
    ];
    const zoe = await insertGuestInto(database, uniqueName('Zoe '));

    expect(await joinAvailablePublicRoom(database, { guestId: zoe, placedAt: new Date() })).toBeNull();
    expect(await database.$count(schema.rooms)).toBe(ineligible.length);
    expect(await countMembers(database, ineligible[0]!)).toBe(gameConfig.rooms.capacity.default);
  });

  test('a player already in the fullest room stays in it instead of taking a second seat', async ({ isolated: { database } }) => {
    const roomId = await openRoomWith(database, { players: 2, minutesAgo: 1 });
    const zoe = await insertGuestInto(database, uniqueName('Zoe '));
    await joinAvailablePublicRoom(database, { guestId: zoe, placedAt: new Date() });

    expect(await joinAvailablePublicRoom(database, { guestId: zoe, placedAt: new Date() })).toEqual({ roomId, result: 'already-member' });
    expect(await countMembers(database, roomId)).toBe(3);
  });

  test('Zoe and Nina clicking at the same instant for the last seat: only one gets it, the other is placed nowhere', async ({ isolated }) => {
    const { database, url } = isolated;
    const lastSeatRoom = await openRoomWith(database, { players: gameConfig.rooms.capacity.default - 1, minutesAgo: 1 });
    const zoe = await insertGuestInto(database, uniqueName('Zoe '));
    const nina = await insertGuestInto(database, uniqueName('Nina '));
    let placing: Promise<(Placement | null)[]> = Promise.resolve([]);

    await whileHoldingRoomRow(
      lastSeatRoom,
      async (waitForQueuedCommands) => {
        placing = Promise.all([joinAvailablePublicRoom(database, { guestId: zoe, placedAt: new Date() }), joinAvailablePublicRoom(database, { guestId: nina, placedAt: new Date() })]);
        await waitForQueuedCommands(2);
      },
      url,
    );
    const placements = await placing;

    expect(placements.filter((placement) => placement === null)).toHaveLength(1);
    expect(placements.find((placement) => placement !== null)).toEqual({ roomId: lastSeatRoom, result: 'joined' });
    expect(await countMembers(database, lastSeatRoom)).toBe(gameConfig.rooms.capacity.default);
  });
});
