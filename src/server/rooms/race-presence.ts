import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { isPastDeadline, type RaceId } from '@/domain/race';
import { abandonmentMomentOf, disconnectionMomentOf, presenceAt, seenSince } from '@/domain/race-presence';
import type { RoomId } from '@/domain/room-id';
import { isRaceRunning } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { findCurrentRace, findRaceParticipants, type CurrentRace } from './race-rows';
import { bumpRevision, lockRoom } from './room-rows';
import { settleWhenAllFinished } from './settle-race';

type PresenceRow = { guestId: GuestId; lastSeenAt: Date; disconnectedAt: Date | null; finishedAt: Date | null; abandonedAt: Date | null; inactiveAt: Date | null };

// No background job watches connections (like the deadline): a member's snapshot read applies what is due under the room lock.
// Racers silent for 30 s abandon at their progress, racers silent for 5 s are shown as disconnected, and the reader is seen now.
// Returns whether the room changed, so the caller announces it.
export async function syncRacePresence(database: Database, roomId: RoomId, now: Date, viewerGuestId: GuestId): Promise<boolean> {
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRaceRunning(room.phase)) return false;
    const race = await findCurrentRace(transaction, roomId);
    if (!race || race.endedAt !== null || isPastDeadline(race.deadlineAt, now)) return false;
    return applyPresence(transaction, { roomId, race, now, viewerGuestId });
  });
}

type PresenceCheck = { roomId: RoomId; race: CurrentRace; now: Date; viewerGuestId: GuestId };

async function applyPresence(transaction: DatabaseTransaction, { roomId, race, now, viewerGuestId }: PresenceCheck): Promise<boolean> {
  let hasChanged = false;
  let hasAbandonment = false;
  for (const row of (await findRaceParticipants(transaction, race.id)).filter(isStillRacing)) {
    const seenAt = seenAtOf(row, race);
    const presence = presenceAt(seenAt, now.getTime());
    if (presence === 'gone') {
      await abandonOnDisconnect(transaction, race.id, row, seenAt);
      hasChanged = hasAbandonment = true;
    } else if (row.guestId === viewerGuestId) {
      await markSeen(transaction, race.id, row.guestId, now);
      hasChanged ||= row.disconnectedAt !== null;
    } else if (presence === 'disconnected' && row.disconnectedAt === null) {
      await markDisconnected(transaction, race.id, row.guestId, new Date(disconnectionMomentOf(seenAt)));
      hasChanged = true;
    }
  }
  if (hasAbandonment) await settleWhenAllFinished(transaction, roomId, race);
  if (hasChanged) await bumpRevision(transaction, roomId);
  return hasChanged;
}

// Before the deadline settles a race, a racer who was already gone 30 s by then counts as an abandoner rather than stopped by the clock.
export async function abandonRacersGoneBy(transaction: DatabaseTransaction, race: CurrentRace, moment: Date): Promise<void> {
  for (const row of (await findRaceParticipants(transaction, race.id)).filter(isStillRacing)) {
    const seenAt = seenAtOf(row, race);
    if (presenceAt(seenAt, moment.getTime()) === 'gone') await abandonOnDisconnect(transaction, race.id, row, seenAt);
  }
}

// A report is the racer coming back; but one arriving after 30 s of silence is too late, so the racer abandons instead. Runs under the room lock.
export async function abandonIfGone(transaction: DatabaseTransaction, race: CurrentRace, row: PresenceRow, now: Date): Promise<boolean> {
  const seenAt = seenAtOf(row, race);
  if (presenceAt(seenAt, now.getTime()) !== 'gone') return false;
  await abandonOnDisconnect(transaction, race.id, row, seenAt);
  return true;
}

// A plain conditional write without the room lock: the snapshot read already showed nothing else is due, and the time only moves forward.
export async function touchPresence(database: Database, roomId: RoomId, guestId: GuestId, now: Date): Promise<void> {
  const currentRaceId = database.select({ id: schema.races.id }).from(schema.races).where(eq(schema.races.roomId, roomId)).orderBy(desc(schema.races.createdAt)).limit(1);
  const { raceParticipants: participant } = schema;
  await database
    .update(participant)
    .set({ lastSeenAt: now })
    .where(
      and(
        eq(participant.raceId, sql`(${currentRaceId})`),
        eq(participant.guestId, guestId),
        isNull(participant.finishedAt),
        isNull(participant.abandonedAt),
        isNull(participant.inactiveAt),
        isNull(participant.disconnectedAt),
        lt(participant.lastSeenAt, now),
      ),
    );
}

function isStillRacing({ finishedAt, abandonedAt, inactiveAt }: PresenceRow): boolean {
  return finishedAt === null && abandonedAt === null && inactiveAt === null;
}

function seenAtOf({ lastSeenAt }: Pick<PresenceRow, 'lastSeenAt'>, race: CurrentRace): number {
  return seenSince(lastSeenAt.getTime(), race.startsAt.getTime());
}

// disconnected_at stays set on the abandonment, which is how the racer's page tells a lost connection from leaving on purpose.
async function abandonOnDisconnect(transaction: DatabaseTransaction, raceId: RaceId, row: PresenceRow, seenAt: number): Promise<void> {
  const disconnectedAt = row.disconnectedAt ?? new Date(disconnectionMomentOf(seenAt));
  await updateParticipant(transaction, raceId, row.guestId, { abandonedAt: new Date(abandonmentMomentOf(seenAt)), disconnectedAt });
}

async function markSeen(transaction: DatabaseTransaction, raceId: RaceId, guestId: GuestId, now: Date): Promise<void> {
  await updateParticipant(transaction, raceId, guestId, { lastSeenAt: now, disconnectedAt: null });
}

async function markDisconnected(transaction: DatabaseTransaction, raceId: RaceId, guestId: GuestId, disconnectedAt: Date): Promise<void> {
  await updateParticipant(transaction, raceId, guestId, { disconnectedAt });
}

type PresenceChanges = Pick<typeof schema.raceParticipants.$inferInsert, 'lastSeenAt' | 'disconnectedAt' | 'abandonedAt'>;

async function updateParticipant(transaction: DatabaseTransaction, raceId: RaceId, guestId: GuestId, changes: PresenceChanges): Promise<void> {
  await transaction
    .update(schema.raceParticipants)
    .set(changes)
    .where(and(eq(schema.raceParticipants.raceId, raceId), eq(schema.raceParticipants.guestId, guestId)));
}
