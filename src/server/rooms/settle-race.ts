import { and, eq, isNull, ne } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { measureRacer, placeRacers, raceRulesVersion, type Placed, type RacerPerformance } from '@/domain/race-results';
import type { RoomId } from '@/domain/room-id';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';
import { findRaceParticipants, type CurrentRace, type RaceParticipantRow } from './race-rows';

export type RaceToSettle = { roomId: RoomId; race: CurrentRace; endedAt: Date };

type SettledRacer = Placed<{ guestId: GuestId; performance: RacerPerformance }>;

// Runs under the room lock. Only the call that ends the race writes results, so a repeated or concurrent call changes nothing and returns false.
export async function settleRace(transaction: DatabaseTransaction, settlement: RaceToSettle): Promise<boolean> {
  if (!(await endRace(transaction, settlement))) return false;
  await recordResults(transaction, settlement, await findRaceParticipants(transaction, settlement.race.id));
  return true;
}

// The race ends at the last finish once every participant has finished; while anyone is still typing it stays open.
export async function settleWhenAllFinished(transaction: DatabaseTransaction, roomId: RoomId, race: CurrentRace): Promise<boolean> {
  const participants = await findRaceParticipants(transaction, race.id);
  const endedAt = lastFinishOf(participants);
  if (endedAt === null) return false;
  const settlement = { roomId, race, endedAt };
  if (!(await endRace(transaction, settlement))) return false;
  await recordResults(transaction, settlement, participants);
  return true;
}

async function recordResults(transaction: DatabaseTransaction, settlement: RaceToSettle, participants: readonly RaceParticipantRow[]): Promise<void> {
  const racers = participants.map((participant) => ({ guestId: participant.guestId, performance: performanceOf(participant, settlement) }));
  for (const racer of placeRacers(racers)) await saveResult(transaction, settlement.race, racer);
  await showResults(transaction, settlement.roomId);
}

function lastFinishOf(participants: readonly RaceParticipantRow[]): Date | null {
  const finishTimes = participants.flatMap((participant) => (participant.finishedAt ? [participant.finishedAt.getTime()] : []));
  if (finishTimes.length < participants.length) return null;
  return new Date(Math.max(...finishTimes));
}

// Only server-held values enter the result: the accepted counters and the server-stamped finish time, or the race end for a racer who never finished.
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

async function endRace(transaction: DatabaseTransaction, { race, endedAt }: RaceToSettle): Promise<boolean> {
  const ended = await transaction
    .update(schema.races)
    .set({ endedAt, rulesVersion: raceRulesVersion })
    .where(and(eq(schema.races.id, race.id), isNull(schema.races.endedAt)))
    .returning({ id: schema.races.id });
  return ended.length > 0;
}

async function showResults(transaction: DatabaseTransaction, roomId: RoomId): Promise<void> {
  await transaction
    .update(schema.rooms)
    .set({ phase: 'results' })
    .where(and(eq(schema.rooms.id, roomId), ne(schema.rooms.phase, 'results')));
}
