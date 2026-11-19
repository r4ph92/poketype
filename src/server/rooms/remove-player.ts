import { and, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import { parseBotMemberKey } from '@/domain/bot-member';
import { isRaceRunning, isRoomOpen, type RoomPhase } from '@/domain/room-phase';
import { isCanonicalUuid } from '@/domain/uuid';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { closeIfIdle, recordLobbyActivity } from './idle-room';
import { markInactiveRacer, type InactiveRacerResult } from './mark-inactive-racer';
import { removeBotFromLobby, type BotRemoval } from './room-bots';
import { banGuest } from './room-bans';
import { bumpRevision, isMember, lockRoom } from './room-rows';

// memberKey names the player as the snapshot shows them; the host is always the session's guest, never a value in the request.
export type RemovePlayerRequest = { roomId: RoomId; guestId: GuestId; memberKey: string; removedAt: Date };

type RemovalTarget = { roomId: RoomId; targetGuestId: GuestId; removedAt: Date };

export type RemovePlayerResult = 'removed' | InactiveRacerResult | 'unknown-player' | 'not-host' | 'not-member' | 'not-found';

// In the waiting room and on the results screen the host kicks any other player or spectator for good (they can never join this room again),
// and removes a bot only while waiting. During a race only a racer without progress for the configured time, and only from that race:
// they stay in the room. A bot always types, so it is never inactive.
export async function removePlayer(database: Database, request: RemovePlayerRequest): Promise<RemovePlayerResult> {
  const { roomId, guestId, removedAt } = request;
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRoomOpen(room.phase)) return 'not-found';
    if (!(await isMember(transaction, roomId, guestId))) return 'not-member';
    if (await closeIfIdle(transaction, room, removedAt)) return 'not-found';
    if (room.hostGuestId !== guestId) return 'not-host';
    const botCharacter = parseBotMemberKey(request.memberKey);
    if (botCharacter) return removeBot(transaction, room.phase, { roomId, character: botCharacter, removedAt });
    const targetGuestId = await findMemberGuest(transaction, roomId, request.memberKey);
    if (!targetGuestId || targetGuestId === guestId) return 'unknown-player';
    const target = { roomId, targetGuestId, removedAt };
    if (isRaceRunning(room.phase)) return markInactiveRacer(transaction, target);
    return kickFromRoom(transaction, room.phase, target);
  });
}

async function removeBot(transaction: DatabaseTransaction, phase: RoomPhase, removal: BotRemoval): Promise<RemovePlayerResult> {
  if (phase === 'waiting') return (await removeBotFromLobby(transaction, removal)) ? 'removed' : 'unknown-player';
  return isRaceRunning(phase) ? 'still-active' : 'not-racing';
}

async function findMemberGuest(transaction: DatabaseTransaction, roomId: RoomId, memberKey: string): Promise<GuestId | null> {
  if (!isCanonicalUuid(memberKey)) return null;
  const [member] = await transaction
    .select({ guestId: schema.roomMembers.guestId })
    .from(schema.roomMembers)
    .where(and(eq(schema.roomMembers.roomId, roomId), eq(schema.roomMembers.id, memberKey)));
  return member?.guestId ?? null;
}

// The ban row also tells the kicked player's open page why it went home, instead of joining the room again through the link.
async function kickFromRoom(transaction: DatabaseTransaction, phase: RoomPhase, { roomId, targetGuestId, removedAt }: RemovalTarget): Promise<RemovePlayerResult> {
  await transaction.delete(schema.roomMembers).where(and(eq(schema.roomMembers.roomId, roomId), eq(schema.roomMembers.guestId, targetGuestId)));
  await banGuest(transaction, roomId, targetGuestId, removedAt);
  if (phase === 'waiting') await recordLobbyActivity(transaction, roomId, removedAt);
  await bumpRevision(transaction, roomId);
  return 'removed';
}
