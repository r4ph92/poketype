import { randomInt } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { frenchPassages } from '@/config/passages';
import type { GuestId } from '@/domain/guest-id';
import { pickPassage } from '@/domain/passage';
import { hasEnoughPlayersToStart, raceStartsAt, type RaceId } from '@/domain/race';
import type { RoomId } from '@/domain/room-id';
import { isRoomOpen } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { bumpRevision, countMembers, isMember, lockRoom } from './room-rows';

export type StartRaceRequest = { roomId: RoomId; guestId: GuestId; requestedAt: Date };

export type StartRaceResult = 'started' | 'already-started' | 'not-enough-players' | 'not-host' | 'not-member' | 'not-found';

export async function startRace(database: Database, request: StartRaceRequest): Promise<StartRaceResult> {
  const { roomId, guestId } = request;
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRoomOpen(room.phase)) return 'not-found';
    if (!(await isMember(transaction, roomId, guestId))) return 'not-member';
    if (room.hostGuestId !== guestId) return 'not-host';
    if (room.phase !== 'waiting') return 'already-started';
    if (!hasEnoughPlayersToStart(await countMembers(transaction, roomId))) return 'not-enough-players';
    await beginCountdown(transaction, request);
    return 'started';
  });
}

async function beginCountdown(transaction: DatabaseTransaction, { roomId, requestedAt }: StartRaceRequest): Promise<void> {
  const passage = pickPassage(frenchPassages, randomInt);
  const [race] = await transaction.insert(schema.races).values({ roomId, passage, startsAt: raceStartsAt(requestedAt) }).returning({ id: schema.races.id });
  await enterEveryMember(transaction, roomId, race!.id);
  await transaction.update(schema.rooms).set({ phase: 'countdown' }).where(eq(schema.rooms.id, roomId));
  await bumpRevision(transaction, roomId);
}

// The room lock keeps anyone from joining after this, so the participants are exactly the members at the start.
async function enterEveryMember(transaction: DatabaseTransaction, roomId: RoomId, raceId: RaceId): Promise<void> {
  const members = await transaction.select({ guestId: schema.roomMembers.guestId }).from(schema.roomMembers).where(eq(schema.roomMembers.roomId, roomId));
  await transaction.insert(schema.raceParticipants).values(members.map(({ guestId }) => ({ raceId, guestId })));
}
