import { randomInt } from 'node:crypto';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import type { HostRole } from '@/domain/host-role';
import { generateRoomCode } from '@/domain/room-code';
import type { RoomId } from '@/domain/room-id';
import { and, eq } from 'drizzle-orm';
import { acceptsNewMembers, isRoomOpen } from '@/domain/room-phase';
import type { RoomVisibility } from '@/domain/room-visibility';
import type { TextLanguage } from '@/domain/text-settings';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { closeIfIdle, recordLobbyActivity } from './idle-room';
import { bumpRevision, isMember, isRoomFull, lockRoom } from './room-rows';

// hostRole is how the host joins their own room; without it they race. textLanguage is the host's interface language at creation; the host can change it in the lobby. Without it the room races in French.
export type OpenRoomRequest = { hostGuestId: GuestId; visibility: RoomVisibility; openedAt: Date; textLanguage?: TextLanguage; hostRole?: HostRole };

export type JoinRoomRequest = { roomId: RoomId; guestId: GuestId; joinedAt: Date };

// private: the room admits newcomers only through a personal invitation link (redeemInvitation), never by its code, link or placement.
export type JoinResult = 'joined' | 'already-member' | 'private' | 'race-started' | 'full' | 'not-found';

export async function openRoom(database: Database, request: OpenRoomRequest): Promise<RoomId> {
  return database.transaction(async (transaction) => {
    const roomId = await insertRoomWithFreeCode(transaction, request);
    await transaction.insert(schema.roomMembers).values({ roomId, guestId: request.hostGuestId, isSpectator: request.hostRole === 'spectator' });
    await bumpRevision(transaction, roomId);
    return roomId;
  });
}

// A taken code inserts nothing instead of failing, so the transaction stays usable for the next draw.
async function insertRoomWithFreeCode(transaction: DatabaseTransaction, { hostGuestId, visibility, openedAt, textLanguage }: OpenRoomRequest): Promise<RoomId> {
  for (let attempt = 0; attempt < gameConfig.rooms.codeGenerationAttempts; attempt += 1) {
    const [room] = await transaction
      .insert(schema.rooms)
      .values({ hostGuestId, visibility, code: generateRoomCode(randomInt), lastActivityAt: openedAt, hostSinceAt: openedAt, textLanguage })
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
    if (room.visibility === 'private') return 'private';
    if (!acceptsNewMembers(room.phase)) return 'race-started';
    if (await isRoomFull(transaction, room)) return 'full';
    return addMember(transaction, request);
  });
}

// The caller holds the room lock and has checked the phase and the seats.
export async function addMember(transaction: DatabaseTransaction, { roomId, guestId, joinedAt }: JoinRoomRequest): Promise<'joined' | 'already-member'> {
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
