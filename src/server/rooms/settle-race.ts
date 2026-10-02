import { and, eq, isNull, ne } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { measureRacer, placeRacers, raceRulesVersion, type Placed, type RacerPerformance } from '@/domain/race-results';
import type { RaceId } from '@/domain/race';
import type { RoomId } from '@/domain/room-id';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';
import { grantMilestoneBadges } from '../trainer/earned-badges';
import { grantRaceCoins } from '../trainer/grant-race-coins';
import { grantRaceXp, type RaceXpEntry } from '../trainer/grant-race-xp';
import { lockGuests } from '../trainer/guest-lock';
import { findRaceParticipants, type CurrentRace, type RaceParticipantRow } from './race-rows';

export type RaceToSettle = { roomId: RoomId; race: CurrentRace; endedAt: Date };

type SettledRacer = Placed<{ guestId: GuestId; performance: RacerPerformance }>;

// Runs under the room lock. Only the call that ends the race writes results, so a repeated or concurrent call changes nothing and returns false.
export async function settleRace(transaction: DatabaseTransaction, settlement: RaceToSettle): Promise<boolean> {
  if (!(await endRace(transaction, settlement))) return false;
  await recordResults(transaction, settlement, await findRaceParticipants(transaction, settlement.race.id));
  return true;
}

// The race ends once every participant has finished or abandoned (H4: abandoners never delay the end); while anyone is still typing it stays open.
export async function settleWhenAllFinished(transaction: DatabaseTransaction, roomId: RoomId, race: CurrentRace): Promise<boolean> {
  const participants = await findRaceParticipants(transaction, race.id);
  const endedAt = lastSettledMomentOf(participants, race);
  if (endedAt === null) return false;
  const settlement = { roomId, race, endedAt };
  if (!(await endRace(transaction, settlement))) return false;
  await recordResults(transaction, settlement, participants);
  return true;
}

async function recordResults(transaction: DatabaseTransaction, settlement: RaceToSettle, participants: readonly RaceParticipantRow[]): Promise<void> {
  const racers = participants.filter((participant) => participant.abandonedAt === null).map((participant) => ({ guestId: participant.guestId, performance: performanceOf(participant, settlement) }));
  const placed = placeRacers(racers);
  for (const racer of placed) await saveResult(transaction, settlement.race, racer);
  await grantRewards(transaction, settlement.race.id, participants, placed);
  await showResults(transaction, settlement.roomId);
}

// Every participant's guest row is locked first, in id order, so two rooms settling with the same players never deadlock.
async function grantRewards(transaction: DatabaseTransaction, raceId: RaceId, participants: readonly RaceParticipantRow[], placed: readonly SettledRacer[]): Promise<void> {
  await lockGuests(transaction, participants.map((participant) => participant.guestId));
  await grantMilestoneBadges(transaction, raceId, finishersOf(participants));
  const field = raceXpFieldOf(participants, placed);
  await grantRaceXp(transaction, raceId, field);
  await grantRaceCoins(transaction, raceId, field);
}

// Everyone who started the race is in the reward field; an abandoner has no place.
function raceXpFieldOf(participants: readonly RaceParticipantRow[], placed: readonly SettledRacer[]): RaceXpEntry[] {
  const places = new Map(placed.map((racer) => [racer.guestId, racer.place]));
  return participants.map(({ guestId, partnerDex }) => ({ guestId, partnerDex, place: places.get(guestId) ?? null }));
}

// Badges count races finished to the end: a racer the time limit stopped, or one who abandoned, earns none from this race.
function finishersOf(participants: readonly RaceParticipantRow[]): GuestId[] {
  return participants.filter((participant) => participant.finishedAt !== null && participant.abandonedAt === null).map((participant) => participant.guestId);
}

// An abandonment during the countdown cannot end the race before it started.
function lastSettledMomentOf(participants: readonly RaceParticipantRow[], race: CurrentRace): Date | null {
  const moments = participants.flatMap((participant) => {
    const moment = participant.finishedAt ?? participant.abandonedAt;
    return moment ? [moment.getTime()] : [];
  });
  if (moments.length < participants.length) return null;
  return new Date(Math.max(race.startsAt.getTime(), ...moments));
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
