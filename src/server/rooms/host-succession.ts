import { and, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { nextHostOf, type HostCandidate } from '@/domain/host-succession';
import { holdsRace } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';
import { findCurrentRace, findRaceParticipants } from './race-rows';
import { bumpRevision, type LockedRoom } from './room-rows';

export type HostSuccession = 'passed' | 'closed';

// Runs under the room lock, in the leave's transaction, so two leaves at once can never leave the room with two hosts or none.
export async function passHostRole(transaction: DatabaseTransaction, room: LockedRoom, leftAt: Date): Promise<HostSuccession> {
  const nextHost = nextHostOf(await findHostCandidates(transaction, room), leftAt.getTime());
  if (nextHost === null) return closeWithoutHost(transaction, room);
  await stopSpectating(transaction, room);
  await transaction.update(schema.rooms).set({ hostGuestId: nextHost, hostSinceAt: leftAt, hostAwayAt: null }).where(eq(schema.rooms.id, room.id));
  await bumpRevision(transaction, room.id);
  return 'passed';
}

// Only the host may spectate, so the one who hands the role over becomes an ordinary member (a silent host stays one).
async function stopSpectating(transaction: DatabaseTransaction, room: LockedRoom): Promise<void> {
  await transaction
    .update(schema.roomMembers)
    .set({ isSpectator: false })
    .where(and(eq(schema.roomMembers.roomId, room.id), eq(schema.roomMembers.guestId, room.hostGuestId)));
}

// A running race the last connected human leaves is discarded without settlement, as when the host closed the room before #76.
async function closeWithoutHost(transaction: DatabaseTransaction, room: LockedRoom): Promise<HostSuccession> {
  await transaction.update(schema.rooms).set({ phase: 'closed', closeReason: 'host-left' }).where(eq(schema.rooms.id, room.id));
  await bumpRevision(transaction, room.id);
  return 'closed';
}

async function findHostCandidates(transaction: DatabaseTransaction, room: LockedRoom): Promise<HostCandidate[]> {
  const members = await transaction
    .select({ memberId: schema.roomMembers.id, guestId: schema.roomMembers.guestId, joinedAt: schema.roomMembers.joinedAt, lastSeenAt: schema.roomMembers.lastSeenAt })
    .from(schema.roomMembers)
    .where(eq(schema.roomMembers.roomId, room.id));
  const abandoners = await findRaceAbandoners(transaction, room);
  return members.map(({ memberId, guestId, joinedAt, lastSeenAt }) => ({
    memberId,
    guestId,
    joinedAt: joinedAt.getTime(),
    lastSeenAt: lastSeenAt.getTime(),
    hasLeft: guestId === room.hostGuestId || abandoners.has(guestId),
  }));
}

// Abandoners stay members until the next race only so the results can list them; they have left and cannot host.
async function findRaceAbandoners(transaction: DatabaseTransaction, room: LockedRoom): Promise<ReadonlySet<GuestId>> {
  if (!holdsRace(room.phase)) return new Set();
  const race = await findCurrentRace(transaction, room.id);
  if (!race) return new Set();
  const participants = await findRaceParticipants(transaction, race.id);
  return new Set(participants.filter((participant) => participant.abandonedAt !== null).map((participant) => participant.guestId));
}
