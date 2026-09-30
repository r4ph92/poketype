import { expect, test as base } from '@playwright/test';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { GuestId } from '../../src/domain/guest-id';
import type { RoomId } from '../../src/domain/room-id';
import type { RoomPhase } from '../../src/domain/room-phase';
import * as schema from '../../src/server/db/schema';
import type { Database } from '../../src/server/db/types';
import { joinRoom, openRoom } from '../../src/server/rooms/room-commands';
import { uniqueName, withTestDatabase } from './support/guests';
import { countMembersOf, readRoomRevision, setRoomPhase } from './support/rooms';

// One connection per test: with fullyParallel, a worker can run afterAll and then take another test from this file.
const test = base.extend<{ database: Database }>({
  database: async ({}, provide) => {
    const connection = postgres(process.env.TEST_DATABASE_URL!, { max: 4 });
    await provide(drizzle(connection, { schema }));
    await connection.end();
  },
});

async function insertGuest(trainerName: string): Promise<GuestId> {
  return withTestDatabase(async (sql) => {
    const [guest] = await sql`insert into guests (trainer_name) values (${trainerName}) returning id`;
    return guest!.id as GuestId;
  });
}

async function openRoomForNewHost(database: Database): Promise<RoomId> {
  return openRoom(database, await insertGuest(uniqueName('Alex ')));
}

test.describe('the join room command', () => {
  test('adds a new guest to a waiting room once and bumps the revision once', async ({ database }) => {
    const roomId = await openRoomForNewHost(database);
    const revisionBefore = await readRoomRevision(roomId);
    const zoe = await insertGuest(uniqueName('Zoe '));

    expect(await joinRoom(database, roomId, zoe)).toBe('joined');
    expect(await joinRoom(database, roomId, zoe)).toBe('already-member');
    expect(await countMembersOf(roomId)).toBe(2);
    expect(await readRoomRevision(roomId)).toBe(revisionBefore + 1);
  });

  test('five parallel joins by the same guest add one membership row', async ({ database }) => {
    const roomId = await openRoomForNewHost(database);
    const revisionBefore = await readRoomRevision(roomId);
    const zoe = await insertGuest(uniqueName('Zoe '));

    const results = await Promise.all(Array.from({ length: 5 }, () => joinRoom(database, roomId, zoe)));
    expect(results.filter((result) => result === 'joined')).toHaveLength(1);
    expect(await countMembersOf(roomId)).toBe(2);
    expect(await readRoomRevision(roomId)).toBe(revisionBefore + 1);
  });

  for (const phase of ['countdown', 'racing', 'results'] satisfies RoomPhase[]) {
    test(`refuses a newcomer while the room is in ${phase}, but still recognizes a member`, async ({ database }) => {
      const roomId = await openRoomForNewHost(database);
      const zoe = await insertGuest(uniqueName('Zoe '));
      await joinRoom(database, roomId, zoe);
      await setRoomPhase(roomId, phase);
      const revisionBefore = await readRoomRevision(roomId);

      expect(await joinRoom(database, roomId, await insertGuest(uniqueName('Nina ')))).toBe('race-started');
      expect(await joinRoom(database, roomId, zoe)).toBe('already-member');
      expect(await countMembersOf(roomId)).toBe(2);
      expect(await readRoomRevision(roomId)).toBe(revisionBefore);
    });
  }

  test('treats a closed room as not found, even for a member', async ({ database }) => {
    const roomId = await openRoomForNewHost(database);
    const zoe = await insertGuest(uniqueName('Zoe '));
    await joinRoom(database, roomId, zoe);
    await setRoomPhase(roomId, 'closed');

    expect(await joinRoom(database, roomId, zoe)).toBe('not-found');
    expect(await joinRoom(database, roomId, await insertGuest(uniqueName('Nina ')))).toBe('not-found');
    expect(await countMembersOf(roomId)).toBe(2);
  });

  test('answers not found for a room that does not exist', async ({ database }) => {
    const zoe = await insertGuest(uniqueName('Zoe '));
    expect(await joinRoom(database, crypto.randomUUID() as RoomId, zoe)).toBe('not-found');
  });
});
