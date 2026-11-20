import { randomInt } from 'node:crypto';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import type { HostRole } from '@/domain/host-role';
import { generateRoomCode } from '@/domain/room-code';
import type { RoomId } from '@/domain/room-id';
import { acceptsNewMembers, isRoomOpen } from '@/domain/room-phase';
import type { RoomVisibility } from '@/domain/room-visibility';
import type { TextLanguage } from '@/domain/text-settings';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { findActiveRoomId, inOtherRoom, isActiveInOtherRoom, reclaimMember, refusingSecondRoom, type InOtherRoom } from './active-membership';
import { closeIfIdle, recordLobbyActivity } from './idle-room';
import { isBanned } from './room-bans';
import { bumpRevision, isMember, isRoomFull, lockRoom } from './room-rows';

// hostRole is how the host joins their own room; without it they race. textLanguage is the host's interface language at creation; the host can change it in the lobby. Without it the room races in French.
export type OpenRoomRequest = { hostGuestId: GuestId; visibility: RoomVisibility; openedAt: Date; textLanguage?: TextLanguage; hostRole?: HostRole };

export type JoinRoomRequest = { roomId: RoomId; guestId: GuestId; joinedAt: Date };

// private: the room admits newcomers only through a personal invitation link (redeemInvitation), never by its code, link or placement.
// banned: the host kicked this guest from the room for good.
// in-other-room: the guest is still in another room and must leave it first (SALLE-06).
export type JoinResult = 'joined' | 'already-member' | 'private' | 'banned' | 'race-started' | 'full' | 'not-found' | InOtherRoom;

export async function openRoom(database: Database, request: OpenRoomRequest): Promise<RoomId | InOtherRoom> {
  return refusingSecondRoom(() =>
    database.transaction(async (transaction) => {
      if ((await findActiveRoomId(transaction, request.hostGuestId)) !== null) return inOtherRoom;
      const roomId = await insertRoomWithFreeCode(transaction, request);
      await transaction.insert(schema.roomMembers).values({ roomId, guestId: request.hostGuestId, isSpectator: request.hostRole === 'spectator' });
      await bumpRevision(transaction, roomId);
      return roomId;
    }),
  );
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
export async function joinRoom(database: Database, request: JoinRoomRequest): Promise<JoinResult> {
  return refusingSecondRoom(() => database.transaction((transaction) => joinLockedRoom(transaction, request)));
}

// The other room is checked last, so the offer to leave it only ever leads to a room that would take the guest.
async function joinLockedRoom(transaction: DatabaseTransaction, request: JoinRoomRequest): Promise<JoinResult> {
  const { roomId, guestId, joinedAt } = request;
  const room = await lockRoom(transaction, roomId);
  if (!room || !isRoomOpen(room.phase) || (await closeIfIdle(transaction, room, joinedAt))) return 'not-found';
  if (await isMember(transaction, roomId, guestId)) return rejoin(transaction, request);
  if (await isBanned(transaction, roomId, guestId)) return 'banned';
  if (room.visibility === 'private') return 'private';
  if (!acceptsNewMembers(room.phase)) return 'race-started';
  if (await isRoomFull(transaction, room)) return 'full';
  if (await isActiveInOtherRoom(transaction, guestId, roomId)) return inOtherRoom;
  return addMember(transaction, request);
}

// A racer who left a running race keeps a released row here; coming back takes the room up again unless another room holds the guest now.
async function rejoin(transaction: DatabaseTransaction, { roomId, guestId }: JoinRoomRequest): Promise<'already-member' | InOtherRoom> {
  if (await isActiveInOtherRoom(transaction, guestId, roomId)) return inOtherRoom;
  await reclaimMember(transaction, roomId, guestId);
  return 'already-member';
}

// The caller holds the room lock and has checked the phase and the seats.
export async function addMember(transaction: DatabaseTransaction, { roomId, guestId, joinedAt }: JoinRoomRequest): Promise<'joined' | 'already-member'> {
  const inserted = await transaction
    .insert(schema.roomMembers)
    .values({ roomId, guestId })
    .onConflictDoNothing({ target: [schema.roomMembers.roomId, schema.roomMembers.guestId] })
    .returning({ id: schema.roomMembers.id });
  if (inserted.length === 0) return 'already-member';
  await recordLobbyActivity(transaction, roomId, joinedAt);
  await bumpRevision(transaction, roomId);
  return 'joined';
}
