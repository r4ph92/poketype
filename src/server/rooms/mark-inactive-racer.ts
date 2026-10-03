import { and, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { isInactiveSince, isPastDeadline } from '@/domain/race';
import type { RoomId } from '@/domain/room-id';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';
import { settleAtDeadline } from './race-deadline';
import { findCurrentParticipant, findCurrentRace, type CurrentRace, type ParticipantRow } from './race-rows';
import { bumpRevision } from './room-rows';
import { settleWhenAllFinished } from './settle-race';

export type InactiveRacerToMark = { roomId: RoomId; targetGuestId: GuestId; removedAt: Date };

export type InactiveRacerResult = 'marked-inactive' | 'still-active' | 'not-racing';

// Runs under the room lock with a race running. The 60 s rule is checked against the stored last accepted report, never a client clock.
// An inactive racer never delays the end: the race settles at once when everyone else is done.
export async function markInactiveRacer(transaction: DatabaseTransaction, target: InactiveRacerToMark): Promise<InactiveRacerResult> {
  const { roomId, targetGuestId, removedAt } = target;
  const race = await findCurrentRace(transaction, roomId);
  if (!race || race.endedAt !== null) return 'not-racing';
  if (isPastDeadline(race.deadlineAt, removedAt)) return settleThenRefuse(transaction, roomId, race);
  const participant = await findCurrentParticipant(transaction, roomId, targetGuestId);
  if (!participant || !isStillRacing(participant)) return 'not-racing';
  if (!isInactiveSince(participant.lastReportedAt ?? race.startsAt, removedAt)) return 'still-active';
  await transaction
    .update(schema.raceParticipants)
    .set({ inactiveAt: removedAt })
    .where(and(eq(schema.raceParticipants.raceId, race.id), eq(schema.raceParticipants.guestId, targetGuestId)));
  await settleWhenAllFinished(transaction, roomId, race);
  await bumpRevision(transaction, roomId);
  return 'marked-inactive';
}

function isStillRacing({ finishedAt, abandonedAt, inactiveAt }: ParticipantRow): boolean {
  return finishedAt === null && abandonedAt === null && inactiveAt === null;
}

async function settleThenRefuse(transaction: DatabaseTransaction, roomId: RoomId, race: CurrentRace): Promise<InactiveRacerResult> {
  await settleAtDeadline(transaction, roomId, race);
  return 'not-racing';
}
