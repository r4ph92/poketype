import { and, eq, isNull } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import { redemptionOutcome, type InvitationUse, type Redeemer } from '@/domain/invitation';
import type { InvitationToken } from '@/domain/invitation-token';
import type { RoomId } from '@/domain/room-id';
import { isRoomOpen } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { closeIfIdle } from '../rooms/idle-room';
import { addMember } from '../rooms/room-commands';
import { countRacers, isMember, lockRoom, type LockedRoom } from '../rooms/room-rows';
import { hashInvitationToken } from './invitation-token';

export type RedeemRequest = Redeemer & { token: InvitationToken; redeemedAt: Date };

export type RedeemRefusal = 'invalid' | 'used' | 'race-started' | 'full';

export type RedeemResult = { outcome: 'joined' | 'already-member'; roomId: RoomId } | { outcome: RedeemRefusal };

type Invitation = { id: string; roomId: RoomId };

type Redemption = { room: LockedRoom; invitationId: string; request: RedeemRequest };

const invalid: RedeemResult = { outcome: 'invalid' };

// The room lock serializes every redemption of the room's links, and the claim only writes a link nobody has used,
// so of two people opening one fresh link at the same instant exactly one joins. A refusal before the claim never uses the link up.
export async function redeemInvitation(database: Database, request: RedeemRequest): Promise<RedeemResult> {
  const invitation = await findInvitation(database, request.token);
  if (!invitation) return invalid;
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, invitation.roomId);
    if (!room || !isRoomOpen(room.phase) || (await closeIfIdle(transaction, room, request.redeemedAt))) return invalid;
    return redeemInLockedRoom(transaction, { room, invitationId: invitation.id, request });
  });
}

async function redeemInLockedRoom(transaction: DatabaseTransaction, { room, invitationId, request }: Redemption): Promise<RedeemResult> {
  const use = await lockInvitationUse(transaction, invitationId);
  const isMemberNow = await isMember(transaction, room.id, request.guestId);
  const outcome = redemptionOutcome({ use, redeemer: request, phase: room.phase, isMember: isMemberNow });
  if (outcome === 'already-member') return { outcome, roomId: room.id };
  if (outcome === 'used' || outcome === 'race-started') return { outcome };
  if ((await countRacers(transaction, room.id)) >= gameConfig.rooms.capacity) return { outcome: 'full' };
  if (outcome === 'join' && !(await claimInvitation(transaction, invitationId, request))) return { outcome: 'used' };
  return { outcome: await addMember(transaction, { roomId: room.id, guestId: request.guestId, joinedAt: request.redeemedAt }), roomId: room.id };
}

async function findInvitation(database: Database, token: InvitationToken): Promise<Invitation | null> {
  const [invitation] = await database
    .select({ id: schema.roomInvitations.id, roomId: schema.roomInvitations.roomId })
    .from(schema.roomInvitations)
    .where(eq(schema.roomInvitations.tokenHash, hashInvitationToken(token)));
  return invitation ?? null;
}

async function lockInvitationUse(transaction: DatabaseTransaction, invitationId: string): Promise<InvitationUse> {
  const [use] = await transaction
    .select({ usedByGuestId: schema.roomInvitations.usedByGuestId, usedAddressKey: schema.roomInvitations.usedAddressKey })
    .from(schema.roomInvitations)
    .where(eq(schema.roomInvitations.id, invitationId))
    .for('update');
  return use!;
}

async function claimInvitation(transaction: DatabaseTransaction, invitationId: string, { guestId, addressKey, redeemedAt }: RedeemRequest): Promise<boolean> {
  const claimed = await transaction
    .update(schema.roomInvitations)
    .set({ usedByGuestId: guestId, usedAddressKey: addressKey, usedAt: redeemedAt })
    .where(and(eq(schema.roomInvitations.id, invitationId), isNull(schema.roomInvitations.usedByGuestId)))
    .returning({ id: schema.roomInvitations.id });
  return claimed.length > 0;
}
