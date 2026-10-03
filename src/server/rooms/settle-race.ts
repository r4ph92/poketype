import { and, eq, isNull, ne } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { measureRacer, placeRacers, raceRulesVersion, type Placed, type RacerPerformance } from '@/domain/race-results';
import type { RewardField } from '@/domain/race-reward';
import type { RoomId } from '@/domain/room-id';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';
import { grantRaceEncounters } from '../encounters/grant-encounters';
import { grantMilestoneBadges } from '../trainer/earned-badges';
import { grantRaceCoins } from '../trainer/grant-race-coins';
import { grantRaceXp, type RaceXpEntry } from '../trainer/grant-race-xp';
import { lockGuests } from '../trainer/guest-lock';
import { grantEarnedLegendaries } from '../trainer/legendary-grants';
import { findRaceBots, findRaceParticipants, type CurrentRace, type RaceParticipantRow } from './race-rows';
import { botEntriesAt, saveBotResult, type BotEntry } from './settle-bots';

export type RaceToSettle = { roomId: RoomId; race: CurrentRace; endedAt: Date };

type PlayerEntry = { kind: 'player'; guestId: GuestId; performance: RacerPerformance };

type SettledPlayer = Placed<PlayerEntry>;

type SettledRacer = SettledPlayer | Placed<BotEntry>;

// Runs under the room lock. Only the call that ends the race writes results, so a repeated or concurrent call changes nothing and returns false.
export async function settleRace(transaction: DatabaseTransaction, settlement: RaceToSettle): Promise<boolean> {
  if (!(await endRace(transaction, settlement))) return false;
  await recordResults(transaction, settlement, await findRaceParticipants(transaction, settlement.race.id));
  return true;
}

// The race ends once every player has finished, abandoned or been removed as inactive (H4: neither ever delays the end); while anyone is still typing it stays open.
// Bots never hold a race open: they are not participants, and the settlement places them wherever their typing is at the end.
export async function settleWhenAllFinished(transaction: DatabaseTransaction, roomId: RoomId, race: CurrentRace): Promise<boolean> {
  const participants = await findRaceParticipants(transaction, race.id);
  const endedAt = lastSettledMomentOf(participants, race);
  if (endedAt === null) return false;
  const settlement = { roomId, race, endedAt };
  if (!(await endRace(transaction, settlement))) return false;
  await recordResults(transaction, settlement, participants);
  return true;
}

// Players and bots are placed together; only players are rewarded, but every bot that started counts as a racer they can beat.
async function recordResults(transaction: DatabaseTransaction, settlement: RaceToSettle, participants: readonly RaceParticipantRow[]): Promise<void> {
  const raceBots = await findRaceBots(transaction, settlement.race.id);
  const players: PlayerEntry[] = participants.filter(isRanked).map((participant) => ({ kind: 'player', guestId: participant.guestId, performance: performanceOf(participant, settlement) }));
  const placed = placeRacers<PlayerEntry | BotEntry>([...players, ...botEntriesAt(settlement.race, raceBots, settlement.endedAt)]);
  for (const racer of placed) await saveSettledRacer(transaction, settlement.race, racer);
  // Every participant's guest row is locked first, in id order, so two rooms settling with the same players never deadlock.
  await lockGuests(transaction, participants.map((participant) => participant.guestId));
  await grantMilestoneBadges(transaction, settlement.race.id, finishersOf(participants));
  const field = rewardFieldOf(participants, placed.filter(isPlayer), raceBots.length);
  await grantRaceXp(transaction, settlement.race.id, field);
  await grantRaceCoins(transaction, settlement.race.id, field);
  await grantRaceEncounters(transaction, settlement.race.id, field);
  await grantEarnedLegendaries(transaction, settlement.race.id, participants.map((participant) => participant.guestId));
  await showResults(transaction, settlement.roomId);
}

function isPlayer(racer: SettledRacer): racer is SettledPlayer {
  return racer.kind === 'player';
}

async function saveSettledRacer(transaction: DatabaseTransaction, race: CurrentRace, racer: SettledRacer): Promise<void> {
  if (isPlayer(racer)) await saveResult(transaction, race, racer);
  else await saveBotResult(transaction, race, racer);
}

// Abandoners and racers removed as inactive leave the ranking: no place, so no XP, Poké Dollars or encounter.
function isRanked(participant: RaceParticipantRow): boolean {
  return participant.abandonedAt === null && participant.inactiveAt === null;
}

// Every player who started the race is an entry; an abandoner or an inactive racer has no place.
function rewardFieldOf(participants: readonly RaceParticipantRow[], placed: readonly SettledPlayer[], botCount: number): RewardField<RaceXpEntry> {
  const places = new Map(placed.map((racer) => [racer.guestId, racer.place]));
  const entries = participants.map(({ guestId, partnerPokemonId }) => ({ guestId, partnerPokemonId, place: places.get(guestId) ?? null }));
  return { racers: participants.length + botCount, entries };
}

// Badges count races finished to the end: a racer the time limit stopped, or one who abandoned, earns none from this race.
function finishersOf(participants: readonly RaceParticipantRow[]): GuestId[] {
  return participants.filter((participant) => participant.finishedAt !== null && participant.abandonedAt === null).map((participant) => participant.guestId);
}

// An abandonment during the countdown cannot end the race before it started.
function lastSettledMomentOf(participants: readonly RaceParticipantRow[], race: CurrentRace): Date | null {
  const moments = participants.flatMap((participant) => {
    const moment = participant.finishedAt ?? participant.abandonedAt ?? participant.inactiveAt;
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

async function saveResult(transaction: DatabaseTransaction, race: CurrentRace, { guestId, performance, place }: SettledPlayer): Promise<void> {
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
