import { count, eq } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import type { InvitationToken } from '@/domain/invitation-token';
import type { RoomId } from '@/domain/room-id';
import { isRoomOpen } from '@/domain/room-phase';
import { invitesByLink } from '@/domain/room-visibility';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { closeIfIdle, recordLobbyActivity } from '../rooms/idle-room';
import { bumpRevision, isMember, lockRoom, type LockedRoom } from '../rooms/room-rows';
import { createInvitationToken, hashInvitationToken } from './invitation-token';

export type CreateInvitationRequest = { roomId: RoomId; guestId: GuestId; createdAt: Date };

export type InvitationRefusal = 'public-room' | 'too-many' | 'race-started' | 'not-host' | 'not-member' | 'not-found';

// The token is returned once, to the host who asked; only its hash is stored.
export type CreateInvitationResult = { outcome: 'created'; id: string; token: InvitationToken } | { outcome: InvitationRefusal };

// Creating a link is lobby activity: it restarts the idle clock like a join does.
export async function createInvitation(database: Database, request: CreateInvitationRequest): Promise<CreateInvitationResult> {
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, request.roomId);
    const refusal = room ? await refusalFor(transaction, room, request) : 'not-found';
    if (refusal) return { outcome: refusal };
    return insertInvitation(transaction, request);
  });
}

async function refusalFor(transaction: DatabaseTransaction, room: LockedRoom, { guestId, createdAt }: CreateInvitationRequest): Promise<InvitationRefusal | null> {
  if (!isRoomOpen(room.phase)) return 'not-found';
  if (!(await isMember(transaction, room.id, guestId))) return 'not-member';
  if (await closeIfIdle(transaction, room, createdAt)) return 'not-found';
  if (room.hostGuestId !== guestId) return 'not-host';
  if (room.phase !== 'waiting') return 'race-started';
  if (!invitesByLink(room.visibility)) return 'public-room';
  return (await countInvitations(transaction, room.id)) >= gameConfig.rooms.maxInvitations ? 'too-many' : null;
}

async function countInvitations(transaction: DatabaseTransaction, roomId: RoomId): Promise<number> {
  const [row] = await transaction.select({ total: count() }).from(schema.roomInvitations).where(eq(schema.roomInvitations.roomId, roomId));
  return row?.total ?? 0;
}

async function insertInvitation(transaction: DatabaseTransaction, { roomId, createdAt }: CreateInvitationRequest): Promise<CreateInvitationResult> {
  const token = createInvitationToken();
  const [invitation] = await transaction
    .insert(schema.roomInvitations)
    .values({ roomId, tokenHash: hashInvitationToken(token), createdAt })
    .returning({ id: schema.roomInvitations.id });
  await recordLobbyActivity(transaction, roomId, createdAt);
  await bumpRevision(transaction, roomId);
  return { outcome: 'created', id: invitation!.id, token };
}
