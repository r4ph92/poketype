import { randomInt } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { raceWordLists } from '@/assets/word-lists';
import type { GuestId } from '@/domain/guest-id';
import { generateRaceText } from '@/domain/race-text';
import { hasEnoughPlayersToStart, raceDeadline, raceStartsAt, type RaceId } from '@/domain/race';
import type { RoomId } from '@/domain/room-id';
import { isRoomOpen } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { closeIfIdle } from './idle-room';
import { bumpRevision, countMembers, isMember, lockRoom } from './room-rows';
import { findTextSettings } from './room-text-settings';

export type StartRaceRequest = { roomId: RoomId; guestId: GuestId; requestedAt: Date };

export type StartRaceResult = 'started' | 'already-started' | 'not-enough-players' | 'not-host' | 'not-member' | 'not-found';

export async function startRace(database: Database, request: StartRaceRequest): Promise<StartRaceResult> {
  const { roomId, guestId } = request;
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRoomOpen(room.phase)) return 'not-found';
    if (!(await isMember(transaction, roomId, guestId))) return 'not-member';
    if (await closeIfIdle(transaction, room, request.requestedAt)) return 'not-found';
    if (room.hostGuestId !== guestId) return 'not-host';
    if (room.phase !== 'waiting') return 'already-started';
    if (!hasEnoughPlayersToStart(await countMembers(transaction, roomId))) return 'not-enough-players';
    await beginCountdown(transaction, request);
    return 'started';
  });
}

// The text is drawn once, here, from the room's settings at the start, so every racer types the same one.
async function beginCountdown(transaction: DatabaseTransaction, { roomId, requestedAt }: StartRaceRequest): Promise<void> {
  const settings = (await findTextSettings(transaction, roomId))!;
  const passage = generateRaceText(settings, raceWordLists, randomInt);
  const startsAt = raceStartsAt(requestedAt);
  const [race] = await transaction
    .insert(schema.races)
    .values({ roomId, passage, textLanguage: settings.language, startsAt, deadlineAt: raceDeadline(startsAt) })
    .returning({ id: schema.races.id });
  await enterEveryMember(transaction, roomId, race!.id);
  await transaction.update(schema.rooms).set({ phase: 'countdown' }).where(eq(schema.rooms.id, roomId));
  await bumpRevision(transaction, roomId);
}

// The room lock keeps anyone from joining after this, so the participants are exactly the members at the start.
// Each one's partner row is recorded now (and its species, for display), so the race and its past results keep showing the Pokémon that raced.
async function enterEveryMember(transaction: DatabaseTransaction, roomId: RoomId, raceId: RaceId): Promise<void> {
  const { roomMembers, ownedPokemon } = schema;
  const members = await transaction
    .select({ guestId: roomMembers.guestId, partnerDex: ownedPokemon.dex, partnerPokemonId: ownedPokemon.id })
    .from(roomMembers)
    .leftJoin(ownedPokemon, and(eq(ownedPokemon.guestId, roomMembers.guestId), eq(ownedPokemon.isPartner, true)))
    .where(eq(roomMembers.roomId, roomId));
  await transaction.insert(schema.raceParticipants).values(members.map((member) => ({ raceId, ...member })));
}
