import { and, eq, isNull, ne } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { measureRacer, placeRacers, raceRulesVersion, type Placed, type RacerPerformance } from '@/domain/race-results';
import type { RoomId } from '@/domain/room-id';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';
import { findRaceParticipants, type CurrentRace, type RaceParticipantRow } from './race-rows';

export type RaceToSettle = { roomId: RoomId; race: CurrentRace; endedAt: Date };

type SettledRacer = Placed<{ guestId: GuestId; performance: RacerPerformance }>;

// Runs under the room lock after each accepted finish; only the last finisher's report settles, and a repeated call changes nothing.
export async function settleRace(transaction: DatabaseTransaction, settlement: RaceToSettle): Promise<void> {
  const participants = await findRaceParticipants(transaction, settlement.race.id);
  if (participants.some((participant) => participant.finishedAt === null)) return;
  const racers = participants.map((participant) => ({ guestId: participant.guestId, performance: performanceOf(participant, settlement) }));
  for (const racer of placeRacers(racers)) await saveResult(transaction, settlement.race, racer);
  await endRace(transaction, settlement);
  await showResults(transaction, settlement.roomId);
}

// Only server-held values enter the result: the accepted counters and the server-stamped finish time.
function performanceOf(participant: RaceParticipantRow, { race, endedAt }: RaceToSettle): RacerPerformance {
  const finishedAt = participant.finishedAt ?? endedAt;
  const { position, keystrokes, rejectedKeystrokes } = participant;
  return { typedCharacters: position, keystrokes, rejectedKeystrokes, elapsedMs: finishedAt.getTime() - race.startsAt.getTime() };
}

async function saveResult(transaction: DatabaseTransaction, race: CurrentRace, { guestId, performance, place }: SettledRacer): Promise<void> {
  const { grossWpm, score, accuracy } = measureRacer(performance);
  await transaction
    .update(schema.raceParticipants)
    .set({ grossWpm, score, accuracy, place })
    .where(and(eq(schema.raceParticipants.raceId, race.id), eq(schema.raceParticipants.guestId, guestId)));
}

async function endRace(transaction: DatabaseTransaction, { race, endedAt }: RaceToSettle): Promise<void> {
  await transaction
    .update(schema.races)
    .set({ endedAt, rulesVersion: raceRulesVersion })
    .where(and(eq(schema.races.id, race.id), isNull(schema.races.endedAt)));
}

async function showResults(transaction: DatabaseTransaction, roomId: RoomId): Promise<void> {
  await transaction
    .update(schema.rooms)
    .set({ phase: 'results' })
    .where(and(eq(schema.rooms.id, roomId), ne(schema.rooms.phase, 'results')));
}
