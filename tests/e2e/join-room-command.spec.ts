import { expect } from '@playwright/test';
import { eq } from 'drizzle-orm';
import { gameConfig } from '../../src/config/game';
import type { RoomId } from '../../src/domain/room-id';
import type { RoomPhase } from '../../src/domain/room-phase';
import * as schema from '../../src/server/db/schema';
import type { JoinResult } from '../../src/server/rooms/room-commands';
import { commandTest as test, insertGuest, joinRoomNow, openRoomForNewHost, whileHoldingRoomRow } from './support/commands';
import { uniqueName, withTestDatabase } from './support/guests';
import { countMembersOf, fillRoomTo, readRoomRevision, setRoomPhase } from './support/rooms';

test.describe('the join room command', () => {
  test('adds a new guest to a waiting room once and bumps the revision once', async ({ database }) => {
    const { roomId } = await openRoomForNewHost(database);
    const revisionBefore = await readRoomRevision(roomId);
    const zoe = await insertGuest(uniqueName('Zoe '));

    expect(await joinRoomNow(database, roomId, zoe)).toBe('joined');
    expect(await joinRoomNow(database, roomId, zoe)).toBe('already-member');
    expect(await countMembersOf(roomId)).toBe(2);
    expect(await readRoomRevision(roomId)).toBe(revisionBefore + 1);
  });

  test('five parallel joins by the same guest add one membership row', async ({ database }) => {
    const { roomId } = await openRoomForNewHost(database);
    const revisionBefore = await readRoomRevision(roomId);
    const zoe = await insertGuest(uniqueName('Zoe '));

    const results = await Promise.all(Array.from({ length: 5 }, () => joinRoomNow(database, roomId, zoe)));
    expect(results.filter((result) => result === 'joined')).toHaveLength(1);
    expect(await countMembersOf(roomId)).toBe(2);
    expect(await readRoomRevision(roomId)).toBe(revisionBefore + 1);
  });

  test('a join waits for a transaction holding the room row and then sees the phase it committed', async ({ database }) => {
    const { roomId } = await openRoomForNewHost(database);
    const zoe = await insertGuest(uniqueName('Zoe '));
    let releaseLock = () => {};
    let lockHeld = () => {};
    const lockIsHeld = new Promise<void>((resolve) => (lockHeld = resolve));
    const lockCanRelease = new Promise<void>((resolve) => (releaseLock = resolve));
    const startingTheRace = database.transaction(async (transaction) => {
      await transaction.select().from(schema.rooms).where(eq(schema.rooms.id, roomId)).for('update');
      await transaction.update(schema.rooms).set({ phase: 'racing' }).where(eq(schema.rooms.id, roomId));
      lockHeld();
      await lockCanRelease;
    });
    await lockIsHeld;

    const joining = joinRoomNow(database, roomId, zoe);
    const settledEarly = await Promise.race([joining.then(() => true), new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 500))]);
    releaseLock();
    await startingTheRace;

    expect(settledEarly).toBe(false);
    expect(await joining).toBe('race-started');
    expect(await countMembersOf(roomId)).toBe(1);
  });

  for (const phase of ['countdown', 'racing', 'results'] satisfies RoomPhase[]) {
    test(`refuses a newcomer while the room is in ${phase}, but still recognizes a member`, async ({ database }) => {
      const { roomId } = await openRoomForNewHost(database);
      const zoe = await insertGuest(uniqueName('Zoe '));
      await joinRoomNow(database, roomId, zoe);
      await setRoomPhase(roomId, phase);
      const revisionBefore = await readRoomRevision(roomId);

      expect(await joinRoomNow(database, roomId, await insertGuest(uniqueName('Nina ')))).toBe('race-started');
      expect(await joinRoomNow(database, roomId, zoe)).toBe('already-member');
      expect(await countMembersOf(roomId)).toBe(2);
      expect(await readRoomRevision(roomId)).toBe(revisionBefore);
    });
  }

  test('waits for a race start in progress, then refuses the newcomer', async ({ database }) => {
    const { roomId } = await openRoomForNewHost(database);
    const zoe = await insertGuest(uniqueName('Zoe '));
    let joinFinished = false;
    let joining: Promise<JoinResult> = Promise.resolve('not-found');

    await withTestDatabase((sql) =>
      sql.begin(async (transaction) => {
        await transaction`select id from rooms where id = ${roomId} for update`;
        await transaction`update rooms set phase = 'countdown', revision = revision + 1 where id = ${roomId}`;
        joining = joinRoomNow(database, roomId, zoe).finally(() => (joinFinished = true));
        await new Promise((resolve) => setTimeout(resolve, 300));
        expect(joinFinished).toBe(false);
      }),
    );
    expect(await joining).toBe('race-started');
    expect(await countMembersOf(roomId)).toBe(1);
  });

  test('refuses a newcomer once the room holds its capacity, but still recognizes a member', async ({ database }) => {
    const { roomId, hostId } = await openRoomForNewHost(database);
    await fillRoomTo(roomId, gameConfig.rooms.capacity);
    const revisionBefore = await readRoomRevision(roomId);

    expect(await joinRoomNow(database, roomId, await insertGuest(uniqueName('Nina ')))).toBe('full');
    expect(await joinRoomNow(database, roomId, hostId)).toBe('already-member');
    expect(await countMembersOf(roomId)).toBe(gameConfig.rooms.capacity);
    expect(await readRoomRevision(roomId)).toBe(revisionBefore);
  });

  test('two newcomers racing for the last seat: one joins, the other is told the room is full', async ({ database }) => {
    const { roomId } = await openRoomForNewHost(database);
    await fillRoomTo(roomId, gameConfig.rooms.capacity - 1);
    const zoe = await insertGuest(uniqueName('Zoe '));
    const nina = await insertGuest(uniqueName('Nina '));

    let joining: Promise<JoinResult[]> = Promise.resolve([]);
    await whileHoldingRoomRow(roomId, async (waitForQueuedCommands) => {
      joining = Promise.all([joinRoomNow(database, roomId, zoe), joinRoomNow(database, roomId, nina)]);
      await waitForQueuedCommands(2);
    });

    expect((await joining).sort()).toEqual(['full', 'joined']);
    expect(await countMembersOf(roomId)).toBe(gameConfig.rooms.capacity);
  });

  test('treats a closed room as not found, even for a member', async ({ database }) => {
    const { roomId } = await openRoomForNewHost(database);
    const zoe = await insertGuest(uniqueName('Zoe '));
    await joinRoomNow(database, roomId, zoe);
    await setRoomPhase(roomId, 'closed');

    expect(await joinRoomNow(database, roomId, zoe)).toBe('not-found');
    expect(await joinRoomNow(database, roomId, await insertGuest(uniqueName('Nina ')))).toBe('not-found');
    expect(await countMembersOf(roomId)).toBe(2);
  });

  test('answers not found for a room that does not exist', async ({ database }) => {
    const zoe = await insertGuest(uniqueName('Zoe '));
    expect(await joinRoomNow(database, crypto.randomUUID() as RoomId, zoe)).toBe('not-found');
  });
});
