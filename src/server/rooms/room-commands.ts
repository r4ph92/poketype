import { randomInt } from 'node:crypto';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import { generateRoomCode } from '@/domain/room-code';
import type { RoomId } from '@/domain/room-id';
import { and, eq } from 'drizzle-orm';
import { acceptsNewMembers, isRoomOpen } from '@/domain/room-phase';
import type { RoomVisibility } from '@/domain/room-visibility';
import type { TextLanguage } from '@/domain/text-settings';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { closeIfIdle, recordLobbyActivity } from './idle-room';
import { bumpRevision, countRacers, isMember, lockRoom } from './room-rows';

// textLanguage is the host's interface language at creation; the host can change it in the lobby. Without it the room races in French.
export type OpenRoomRequest = { hostGuestId: GuestId; visibility: RoomVisibility; openedAt: Date; textLanguage?: TextLanguage };

export type JoinRoomRequest = { roomId: RoomId; guestId: GuestId; joinedAt: Date };

export type JoinResult = 'joined' | 'already-member' | 'race-started' | 'full' | 'not-found';

export async function openRoom(database: Database, request: OpenRoomRequest): Promise<RoomId> {
  return database.transaction(async (transaction) => {
    const roomId = await insertRoomWithFreeCode(transaction, request);
    await transaction.insert(schema.roomMembers).values({ roomId, guestId: request.hostGuestId });
    await bumpRevision(transaction, roomId);
    return roomId;
  });
}

// A taken code inserts nothing instead of failing, so the transaction stays usable for the next draw.
async function insertRoomWithFreeCode(transaction: DatabaseTransaction, { hostGuestId, visibility, openedAt, textLanguage }: OpenRoomRequest): Promise<RoomId> {
  for (let attempt = 0; attempt < gameConfig.rooms.codeGenerationAttempts; attempt += 1) {
    const [room] = await transaction
      .insert(schema.rooms)
      .values({ hostGuestId, visibility, code: generateRoomCode(randomInt), lastActivityAt: openedAt, textLanguage })
      .onConflictDoNothing({ target: schema.rooms.code })
      .returning({ id: schema.rooms.id });
    if (room) return room.id;
  }
  throw new Error('No free room code after the configured attempts.');
}

// A real join restarts the idle clock, so opening the link of an idle room revives it until its close time.
// A player the host removed may come back: joining clears the removal.
export async function joinRoom(database: Database, request: JoinRoomRequest): Promise<JoinResult> {
  const { roomId, guestId, joinedAt } = request;
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRoomOpen(room.phase) || (await closeIfIdle(transaction, room, joinedAt))) return 'not-found';
    if (await isMember(transaction, roomId, guestId)) return 'already-member';
    if (!acceptsNewMembers(room.phase)) return 'race-started';
    if ((await countRacers(transaction, roomId)) >= gameConfig.rooms.capacity) return 'full';
    return addMember(transaction, request);
  });
}

async function addMember(transaction: DatabaseTransaction, { roomId, guestId, joinedAt }: JoinRoomRequest): Promise<JoinResult> {
  const inserted = await transaction
    .insert(schema.roomMembers)
    .values({ roomId, guestId })
    .onConflictDoNothing({ target: [schema.roomMembers.roomId, schema.roomMembers.guestId] })
    .returning({ id: schema.roomMembers.id });
  if (inserted.length === 0) return 'already-member';
  await transaction.delete(schema.roomRemovals).where(and(eq(schema.roomRemovals.roomId, roomId), eq(schema.roomRemovals.guestId, guestId)));
  await recordLobbyActivity(transaction, roomId, joinedAt);
  await bumpRevision(transaction, roomId);
  return 'joined';
}
