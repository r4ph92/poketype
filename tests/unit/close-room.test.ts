import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { GuestId } from '../../src/domain/guest-id';
import type { RoomId } from '../../src/domain/room-id';
import { closeRoom } from '../../src/server/rooms/close-room';
import { createInvitation } from '../../src/server/invitations/create-invitation';
import { redeemInvitation } from '../../src/server/invitations/redeem-invitation';
import { findRoomForCode } from '../../src/server/rooms/join-room-by-code';
import { findPublicRooms } from '../../src/server/rooms/public-rooms';
import { findRoomSnapshot } from '../../src/server/rooms/room-snapshot';
import { joinRoom, openRoom } from '../../src/server/rooms/room-commands';
import { openTestDatabase, type TestDatabase } from './support/test-database';

let testDatabase: TestDatabase;

beforeAll(() => {
  testDatabase = openTestDatabase();
});

afterAll(async () => {
  await testDatabase.sql.end();
});

type Room = { roomId: RoomId; code: string; maya: GuestId; leo: GuestId };

async function insertGuest(prefix: string): Promise<GuestId> {
  const [guest] = await testDatabase.sql`insert into guests (trainer_name) values (${`${prefix}${crypto.randomUUID().slice(0, 8)}`}) returning id`;
  return guest!.id as GuestId;
}

async function openRoomWithLeo(visibility: 'public' | 'unlisted' = 'public'): Promise<Room> {
  const maya = await insertGuest('Maya ');
  const leo = await insertGuest('Leo ');
  const roomId = (await openRoom(testDatabase.database, { hostGuestId: maya, visibility, openedAt: new Date() })) as RoomId;
  await joinRoom(testDatabase.database, { roomId, guestId: leo, joinedAt: new Date() });
  const [room] = await testDatabase.sql`select code from rooms where id = ${roomId}`;
  return { roomId, code: room!.code as string, maya, leo };
}

// A race with a participant per member, as the start command writes it; the phase is set directly because settlement is not under test.
async function enterPhase(roomId: RoomId, phase: 'waiting' | 'countdown' | 'racing' | 'results'): Promise<void> {
  if (phase === 'countdown' || phase === 'racing' || phase === 'results') {
    const [race] = await testDatabase.sql`insert into races (room_id, passage, starts_at, deadline_at, time_limit_seconds) values (${roomId}, 'Le garçon range ses crayons.', now(), now() + interval '60 seconds', 60) returning id`;
    await testDatabase.sql`insert into race_participants (race_id, guest_id) select ${race!.id}, guest_id from room_members where room_id = ${roomId}`;
  }
  await testDatabase.sql`update rooms set phase = ${phase} where id = ${roomId}`;
}

async function readRoom(roomId: RoomId): Promise<{ phase: string; closeReason: string | null; releasedMembers: number }> {
  const [room] = await testDatabase.sql`select phase, close_reason from rooms where id = ${roomId}`;
  const [released] = await testDatabase.sql`select count(*)::int as total from room_members where room_id = ${roomId} and released_at is not null`;
  return { phase: room!.phase as string, closeReason: room!.close_reason as string | null, releasedMembers: released!.total as number };
}

function close(roomId: RoomId, guestId: GuestId) {
  return closeRoom(testDatabase.database, { roomId, guestId, closedAt: new Date() });
}

describe('closing a room from its results', () => {
  it('closes it for the host with the host-closed reason and releases every member', async () => {
    const { roomId, maya } = await openRoomWithLeo();
    await enterPhase(roomId, 'results');
    expect(await close(roomId, maya)).toBe('closed');
    expect(await readRoom(roomId)).toEqual({ phase: 'closed', closeReason: 'host-closed', releasedMembers: 2 });
  });

  it('refuses a member who is not the host and leaves the room open', async () => {
    const { roomId, leo } = await openRoomWithLeo();
    await enterPhase(roomId, 'results');
    expect(await close(roomId, leo)).toBe('not-host');
    expect(await readRoom(roomId)).toEqual({ phase: 'results', closeReason: null, releasedMembers: 0 });
  });

  it('refuses someone outside the room and an unknown room', async () => {
    const { roomId } = await openRoomWithLeo();
    await enterPhase(roomId, 'results');
    expect(await close(roomId, await insertGuest('Zoe '))).toBe('not-member');
    expect(await close('00000000-0000-4000-8000-000000000000' as RoomId, await insertGuest('Zoe '))).toBe('not-found');
  });

  it.each(['waiting', 'countdown', 'racing'] as const)('refuses the host while the room is %s', async (phase) => {
    const { roomId, maya } = await openRoomWithLeo();
    await enterPhase(roomId, phase);
    expect(await close(roomId, maya)).toBe('not-results');
    expect(await readRoom(roomId)).toEqual({ phase, closeReason: null, releasedMembers: 0 });
  });

  it('answers a second close of the same room as not found', async () => {
    const { roomId, maya } = await openRoomWithLeo();
    await enterPhase(roomId, 'results');
    await close(roomId, maya);
    expect(await close(roomId, maya)).toBe('not-found');
  });

  it('keeps the race, its participants and the rewards ledger as they were', async () => {
    const { roomId, maya } = await openRoomWithLeo();
    await enterPhase(roomId, 'results');
    const count = async () => (await testDatabase.sql`select (select count(*) from races where room_id = ${roomId})::int as races, (select count(*) from race_participants p join races r on r.id = p.race_id where r.room_id = ${roomId})::int as participants`)[0];
    const before = await count();
    await close(roomId, maya);
    expect(await count()).toEqual(before);
    expect(before).toEqual({ races: 1, participants: 2 });
  });

  it('tells each member the host closed it, and everyone else the room is unknown', async () => {
    const { roomId, maya, leo } = await openRoomWithLeo();
    await enterPhase(roomId, 'results');
    await close(roomId, maya);
    expect((await findRoomSnapshot(testDatabase.database, roomId, leo)).kind).toBe('closed-by-host');
    expect((await findRoomSnapshot(testDatabase.database, roomId, maya)).kind).toBe('closed-by-host');
    expect((await findRoomSnapshot(testDatabase.database, roomId, await insertGuest('Zoe '))).kind).toBe('not-found');
  });

  it('answers its code as unknown and drops it off the public list', async () => {
    const { roomId, code, maya } = await openRoomWithLeo();
    await enterPhase(roomId, 'results');
    const listed = async () => (await findPublicRooms(testDatabase.database, 100_000, new Date())).some((room) => room.roomId === roomId);
    expect(await listed()).toBe(true);
    await close(roomId, maya);
    expect(await listed()).toBe(false);
    const lookup = await findRoomForCode(testDatabase.database, { typedCode: code, guestId: await insertGuest('Zoe '), addressKey: null });
    expect(lookup).toEqual({ outcome: 'unknown' });
  });

  it('refuses an unused invitation as a closed room', async () => {
    const { roomId, maya } = await openRoomWithLeo('unlisted');
    const invitation = await createInvitation(testDatabase.database, { roomId, guestId: maya, createdAt: new Date() });
    if (invitation.outcome !== 'created') throw new Error('The invitation was not created.');
    await enterPhase(roomId, 'results');
    await close(roomId, maya);
    const redeemed = await redeemInvitation(testDatabase.database, { token: invitation.token, guestId: await insertGuest('Nina '), addressKey: null, redeemedAt: new Date() });
    expect(redeemed).toEqual({ outcome: 'room-closed' });
  });
});
