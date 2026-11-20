import { eq } from 'drizzle-orm';
import { botMemberKey, parseBotMemberKey } from '@/domain/bot-member';
import { botProgressAt } from '@/domain/bot-race';
import { awardDueBonuses, bonusCheckpoints, type BonusAward, type BonusRacer } from '@/domain/catch-up-bonus';
import type { GuestId } from '@/domain/guest-id';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';
import { bonusesOf, findRaceBonuses, racerTextLengthIn, wordsRemovedFrom, type RaceBonusRow } from './race-bonuses';
import { findRaceBots, findRaceParticipants, type CurrentRace, type RaceBotRow, type RaceParticipantRow } from './race-rows';

type BonusContext = { race: CurrentRace; bonuses: readonly RaceBonusRow[]; elapsedMs: number };

// Runs under the room lock after every accepted progress report: players are where their accepted reports put them, bots where their seed puts
// them at that moment on their own text. Only this server code ever creates a bonus; no request names one (BONUS-01, COURSE-06).
export async function awardCatchUpBonuses(transaction: DatabaseTransaction, race: CurrentRace, now: Date): Promise<void> {
  if (!race.catchUpBonuses || race.bonusCheckpointsPassed >= bonusCheckpoints.length) return;
  const context: BonusContext = { race, bonuses: await findRaceBonuses(transaction, race), elapsedMs: Math.max(0, now.getTime() - race.startsAt.getTime()) };
  const participants = await findRaceParticipants(transaction, race.id);
  const raceBots = await findRaceBots(transaction, race.id);
  const racers = [...participants.map((participant) => playerRacer(participant, context)), ...raceBots.map((raceBot) => botRacer(raceBot, context))];
  const outcome = awardDueBonuses({ isEnabled: race.catchUpBonuses, passage: race.passage, checkpointsPassed: race.bonusCheckpointsPassed, racers });
  if (outcome.checkpointsPassed === race.bonusCheckpointsPassed) return;
  if (outcome.awards.length > 0) await transaction.insert(schema.raceBonuses).values(outcome.awards.map((award) => bonusRowOf(race, award, now)));
  await transaction.update(schema.races).set({ bonusCheckpointsPassed: outcome.checkpointsPassed }).where(eq(schema.races.id, race.id));
}

function playerRacer(participant: RaceParticipantRow, { bonuses }: BonusContext): BonusRacer {
  const received = bonusesOf(bonuses, participant.guestId);
  const isOut = participant.abandonedAt !== null || participant.inactiveAt !== null;
  return { racerKey: participant.guestId, position: participant.position, isFinished: participant.finishedAt !== null, isOut, wordsRemoved: wordsRemovedFrom(received), bonusesReceived: received.length };
}

function botRacer(raceBot: RaceBotRow, { race, bonuses, elapsedMs }: BonusContext): BonusRacer {
  const racerKey = botMemberKey(raceBot.character);
  const received = bonusesOf(bonuses, racerKey);
  const { position, finishMs } = botProgressAt(raceBot, racerTextLengthIn(race, bonuses, racerKey), elapsedMs);
  return { racerKey, position, isFinished: finishMs !== null, isOut: false, wordsRemoved: wordsRemovedFrom(received), bonusesReceived: received.length };
}

function bonusRowOf(race: CurrentRace, { racerKey, checkpoint, kind, wordsRemoved }: BonusAward, awardedAt: Date) {
  const botCharacter = parseBotMemberKey(racerKey);
  const guestId = botCharacter === null ? (racerKey as GuestId) : null;
  return { raceId: race.id, guestId, botCharacter, checkpoint, kind, wordsRemoved, awardedAt };
}
