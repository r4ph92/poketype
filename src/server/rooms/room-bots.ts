import { and, asc, eq } from 'drizzle-orm';
import { charactersOfLevel, type BotCharacterId, type BotLevel } from '@/assets/bot-characters';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import { pickOne, type RandomSource } from '@/domain/random-source';
import type { RoomId } from '@/domain/room-id';
import { isRoomOpen } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, DatabaseExecutor, DatabaseTransaction } from '../db/types';
import { secureRandom } from '../random';
import { closeIfIdle, recordLobbyActivity } from './idle-room';
import { bumpRevision, countRacers, isMember, lockRoom } from './room-rows';

export type RoomBot = { character: BotCharacterId; level: BotLevel };

// The host is always the session's guest; the request only names the level, and the server draws the character.
export type AddBotRequest = { roomId: RoomId; guestId: GuestId; level: BotLevel; addedAt: Date };

// level-full: every character of that level is already in the room.
export type AddBotResult = 'added' | 'level-full' | 'full' | 'race-started' | 'not-host' | 'not-member' | 'not-found';

export type BotRemoval = { roomId: RoomId; character: BotCharacterId; removedAt: Date };

// Only the host, only in the waiting room, and only while a seat is free: a bot takes a seat like a player.
export async function addBot(database: Database, request: AddBotRequest, random: RandomSource = secureRandom): Promise<AddBotResult> {
  const { roomId, guestId, addedAt } = request;
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRoomOpen(room.phase)) return 'not-found';
    if (!(await isMember(transaction, roomId, guestId))) return 'not-member';
    if (await closeIfIdle(transaction, room, addedAt)) return 'not-found';
    if (room.hostGuestId !== guestId) return 'not-host';
    if (room.phase !== 'waiting') return 'race-started';
    if ((await countRacers(transaction, roomId)) >= gameConfig.rooms.capacity) return 'full';
    return insertFreeCharacter(transaction, request, random);
  });
}

export async function findRoomBots(executor: DatabaseExecutor, roomId: RoomId): Promise<RoomBot[]> {
  return executor
    .select({ character: schema.roomBots.character, level: schema.roomBots.level })
    .from(schema.roomBots)
    .where(eq(schema.roomBots.roomId, roomId))
    .orderBy(asc(schema.roomBots.addedAt), asc(schema.roomBots.character));
}

// Runs under the room lock in the waiting phase. A bot unknown to the room removes nothing.
export async function removeBotFromLobby(transaction: DatabaseTransaction, { roomId, character, removedAt }: BotRemoval): Promise<boolean> {
  const removed = await transaction
    .delete(schema.roomBots)
    .where(and(eq(schema.roomBots.roomId, roomId), eq(schema.roomBots.character, character)))
    .returning({ character: schema.roomBots.character });
  if (removed.length === 0) return false;
  await recordLobbyActivity(transaction, roomId, removedAt);
  await bumpRevision(transaction, roomId);
  return true;
}

async function insertFreeCharacter(transaction: DatabaseTransaction, { roomId, level, addedAt }: AddBotRequest, random: RandomSource): Promise<AddBotResult> {
  const taken = new Set((await findRoomBots(transaction, roomId)).map((bot) => bot.character));
  const free = charactersOfLevel(level).filter((character) => !taken.has(character.id));
  if (free.length === 0) return 'level-full';
  await transaction.insert(schema.roomBots).values({ roomId, character: pickOne(free, random).id, level, addedAt });
  await recordLobbyActivity(transaction, roomId, addedAt);
  await bumpRevision(transaction, roomId);
  return 'added';
}
