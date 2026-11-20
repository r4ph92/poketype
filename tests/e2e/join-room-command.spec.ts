import { expect } from '@playwright/test';
import { eq } from 'drizzle-orm';
import { gameConfig } from '../../src/config/game';
import type { GuestId } from '../../src/domain/guest-id';
import type { RoomId } from '../../src/domain/room-id';
import type { RoomPhase } from '../../src/domain/room-phase';
import * as schema from '../../src/server/db/schema';
import { createInvitation } from '../../src/server/invitations/create-invitation';
import { redeemInvitation } from '../../src/server/invitations/redeem-invitation';
import { findCurrentRoom } from '../../src/server/rooms/current-room';
import { joinRoomByCode } from '../../src/server/rooms/join-room-by-code';
import { leaveRoom } from '../../src/server/rooms/leave-room';
import { openRoom, type JoinResult } from '../../src/server/rooms/room-commands';
import { joinAvailablePublicRoom } from '../../src/server/rooms/room-placement';
import { commandTest as test, insertGuest, joinRoomNow, openRoomForNewHost, whileHoldingRoomRow } from './support/commands';
import { uniqueName, withTestDatabase } from './support/guests';
import { countMembersOf, fillRoomTo, readRoomCode, readRoomRevision, setLobbyInactiveFor, setRoomPhase, startRaceInDatabase, uniqueTestAddress } from './support/rooms';

async function readActiveRoomsOf(guestId: GuestId): Promise<string[]> {
  return withTestDatabase(async (sql) => {
    const rows = await sql`select room_id from room_members where guest_id = ${guestId} and released_at is null`;
    return rows.map((row) => row.room_id as string);
  });
}

async function isMemberRowKept(roomId: RoomId, guestId: GuestId): Promise<boolean> {
  return withTestDatabase(async (sql) => (await sql`select 1 from room_members where room_id = ${roomId} and guest_id = ${guestId}`).length === 1);
}

async function readAbandonedAt(roomId: RoomId, guestId: GuestId): Promise<Date | null> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`
      select p.abandoned_at from race_participants p join races r on r.id = p.race_id
      where r.room_id = ${roomId} and p.guest_id = ${guestId}`;
    return (row?.abandoned_at as Date | null) ?? null;
  });
}

async function readInvitationUser(invitationId: string): Promise<string | null> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`select used_by_guest_id from room_invitations where id = ${invitationId}`;
    return (row!.used_by_guest_id as string | null) ?? null;
  });
}

async function guestInRoom(database: Parameters<typeof joinRoomNow>[0]): Promise<{ roomId: RoomId; hostId: GuestId; zoe: GuestId }> {
  const { roomId, hostId } = await openRoomForNewHost(database);
  const zoe = await insertGuest(uniqueName('Zoe '));
  expect(await joinRoomNow(database, roomId, zoe)).toBe('joined');
  return { roomId, hostId, zoe };
}

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

  for (const phase of ['countdown', 'racing'] satisfies RoomPhase[]) {
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
    await fillRoomTo(roomId, gameConfig.rooms.capacity.default);
    const revisionBefore = await readRoomRevision(roomId);

    expect(await joinRoomNow(database, roomId, await insertGuest(uniqueName('Nina ')))).toBe('full');
    expect(await joinRoomNow(database, roomId, hostId)).toBe('already-member');
    expect(await countMembersOf(roomId)).toBe(gameConfig.rooms.capacity.default);
    expect(await readRoomRevision(roomId)).toBe(revisionBefore);
  });

  test('two newcomers racing for the last seat: one joins, the other is told the room is full', async ({ database }) => {
    const { roomId } = await openRoomForNewHost(database);
    await fillRoomTo(roomId, gameConfig.rooms.capacity.default - 1);
    const zoe = await insertGuest(uniqueName('Zoe '));
    const nina = await insertGuest(uniqueName('Nina '));

    let joining: Promise<JoinResult[]> = Promise.resolve([]);
    await whileHoldingRoomRow(roomId, async (waitForQueuedCommands) => {
      joining = Promise.all([joinRoomNow(database, roomId, zoe), joinRoomNow(database, roomId, nina)]);
      await waitForQueuedCommands(2);
    });

    expect((await joining).sort()).toEqual(['full', 'joined']);
    expect(await countMembersOf(roomId)).toBe(gameConfig.rooms.capacity.default);
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

test.describe('one room at a time (SALLE-06)', () => {
  test('a guest in one room is refused another one, which stays as it was; reopening her own room is no switch', async ({ database }) => {
    const maya = await guestInRoom(database);
    const { roomId: otherRoomId } = await openRoomForNewHost(database);
    const revisionBefore = await readRoomRevision(otherRoomId);

    expect(await joinRoomNow(database, otherRoomId, maya.zoe)).toBe('in-other-room');
    expect(await joinRoomNow(database, maya.roomId, maya.zoe)).toBe('already-member');
    expect(await countMembersOf(otherRoomId)).toBe(1);
    expect(await readRoomRevision(otherRoomId)).toBe(revisionBefore);
    expect(await readActiveRoomsOf(maya.zoe)).toEqual([maya.roomId]);
  });

  test('two joins to two rooms at the same instant leave the guest in exactly one', async ({ database }) => {
    const zoe = await insertGuest(uniqueName('Zoe '));
    const first = await openRoomForNewHost(database);
    const second = await openRoomForNewHost(database);

    const results = await Promise.all([joinRoomNow(database, first.roomId, zoe), joinRoomNow(database, second.roomId, zoe)]);

    expect([...results].sort()).toEqual(['in-other-room', 'joined']);
    expect(await readActiveRoomsOf(zoe)).toHaveLength(1);
  });

  test('the database refuses the second membership even when the code check could not see the first', async ({ database }) => {
    const zoe = await insertGuest(uniqueName('Zoe '));
    const first = await openRoomForNewHost(database);
    const second = await openRoomForNewHost(database);
    let joinFinished = false;
    let joining: Promise<JoinResult> = Promise.resolve('not-found');

    await withTestDatabase((sql) =>
      sql.begin(async (transaction) => {
        await transaction`insert into room_members (room_id, guest_id) values (${first.roomId}, ${zoe})`;
        joining = joinRoomNow(database, second.roomId, zoe).finally(() => (joinFinished = true));
        await new Promise((resolve) => setTimeout(resolve, 300));
        expect(joinFinished).toBe(false);
      }),
    );

    expect(await joining).toBe('in-other-room');
    expect(await readActiveRoomsOf(zoe)).toEqual([first.roomId]);
    await expect(withTestDatabase((sql) => sql`insert into room_members (room_id, guest_id) values (${second.roomId}, ${zoe})`)).rejects.toMatchObject({
      code: '23505',
      constraint_name: schema.activeMembershipUniqueIndex,
    });
  });

  test('a host still in a room is refused a new room before anything is created', async ({ database }) => {
    const { hostId } = await openRoomForNewHost(database);

    expect(await openRoom(database, { hostGuestId: hostId, visibility: 'public', openedAt: new Date() })).toBe('in-other-room');
    expect(await withTestDatabase(async (sql) => (await sql`select id from rooms where host_guest_id = ${hostId}`).length)).toBe(1);
  });

  test('leaving the waiting room frees the guest for another room', async ({ database }) => {
    const maya = await guestInRoom(database);
    const { roomId: otherRoomId } = await openRoomForNewHost(database);

    expect(await leaveRoom(database, { roomId: maya.roomId, guestId: maya.zoe, leftAt: new Date() })).toBe('left');

    expect(await joinRoomNow(database, otherRoomId, maya.zoe)).toBe('joined');
    expect(await readActiveRoomsOf(maya.zoe)).toEqual([otherRoomId]);
  });

  test('leaving a running race records the abandon, keeps the row for the results and frees the guest', async ({ database }) => {
    const maya = await guestInRoom(database);
    await startRaceInDatabase(maya.roomId, -5_000);
    expect((await findCurrentRoom(database, maya.zoe, new Date()))?.isRacing).toBe(true);
    const { roomId: otherRoomId } = await openRoomForNewHost(database);

    expect(await leaveRoom(database, { roomId: maya.roomId, guestId: maya.zoe, leftAt: new Date() })).toBe('left');

    expect(await readAbandonedAt(maya.roomId, maya.zoe)).not.toBeNull();
    expect(await isMemberRowKept(maya.roomId, maya.zoe)).toBe(true);
    expect(await joinRoomNow(database, otherRoomId, maya.zoe)).toBe('joined');
  });

  test('a racer who left takes her old room back only while no other room holds her', async ({ database }) => {
    const maya = await guestInRoom(database);
    await startRaceInDatabase(maya.roomId, -5_000);
    await leaveRoom(database, { roomId: maya.roomId, guestId: maya.zoe, leftAt: new Date() });
    const { roomId: otherRoomId } = await openRoomForNewHost(database);
    await joinRoomNow(database, otherRoomId, maya.zoe);

    expect(await joinRoomNow(database, maya.roomId, maya.zoe)).toBe('in-other-room');
    await leaveRoom(database, { roomId: otherRoomId, guestId: maya.zoe, leftAt: new Date() });
    expect(await joinRoomNow(database, maya.roomId, maya.zoe)).toBe('already-member');
    expect(await readActiveRoomsOf(maya.zoe)).toEqual([maya.roomId]);
  });

  test('a room closing because its host left, or because it sat idle, frees everyone still in it', async ({ database }) => {
    const hostLeft = await guestInRoom(database);
    await withTestDatabase((sql) => sql`update room_members set last_seen_at = to_timestamp(0) where room_id = ${hostLeft.roomId}`);
    expect(await leaveRoom(database, { roomId: hostLeft.roomId, guestId: hostLeft.hostId, leftAt: new Date() })).toBe('closed');
    const idle = await guestInRoom(database);
    await setLobbyInactiveFor(idle.roomId, gameConfig.rooms.closeAfterMs + 1_000);

    expect(await findCurrentRoom(database, idle.zoe, new Date())).toBeNull();
    expect(await readActiveRoomsOf(hostLeft.zoe)).toEqual([]);
    expect(await readActiveRoomsOf(idle.zoe)).toEqual([]);
    expect(await readActiveRoomsOf(idle.hostId)).toEqual([]);
  });

  test('the code and the quick race refuse a guest in another room without adding her anywhere', async ({ database }) => {
    const maya = await guestInRoom(database);
    const { roomId: otherRoomId } = await openRoomForNewHost(database);
    const typedCode = await readRoomCode(otherRoomId);

    const byCode = await joinRoomByCode(database, { typedCode, guestId: maya.zoe, addressKey: uniqueTestAddress(), joinedAt: new Date() });
    const placement = await joinAvailablePublicRoom(database, { guestId: maya.zoe, placedAt: new Date(), skippedRoomId: maya.roomId });

    expect(byCode).toEqual({ outcome: 'in-other-room', roomId: otherRoomId });
    expect(placement?.result).toBe('in-other-room');
    expect(await readActiveRoomsOf(maya.zoe)).toEqual([maya.roomId]);
  });

  test('an invitation opened from another room stays unused until the guest has left that room', async ({ database }) => {
    const maya = await guestInRoom(database);
    const { roomId: privateRoomId, hostId } = await openRoomForNewHost(database, 'private');
    const invitation = await createInvitation(database, { roomId: privateRoomId, guestId: hostId, createdAt: new Date() });
    if (invitation.outcome !== 'created') throw new Error(invitation.outcome);
    const redeem = () => redeemInvitation(database, { token: invitation.token, guestId: maya.zoe, addressKey: uniqueTestAddress(), redeemedAt: new Date() });

    expect(await redeem()).toEqual({ outcome: 'in-other-room', roomId: privateRoomId });
    expect(await readInvitationUser(invitation.id)).toBeNull();
    await leaveRoom(database, { roomId: maya.roomId, guestId: maya.zoe, leftAt: new Date() });
    expect(await redeem()).toEqual({ outcome: 'joined', roomId: privateRoomId });
  });
});
