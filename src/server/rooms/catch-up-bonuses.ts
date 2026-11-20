import { randomInt } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { raceWordLists } from '@/assets/word-lists';
import { gameConfig } from '@/config/game';
import { botMemberKey, parseBotMemberKey } from '@/domain/bot-member';
import { botProgressAt } from '@/domain/bot-race';
import { awardDueBonuses, bonusCheckpoints, drawBonusKind, hasDueCheckpoint, type BonusAward, type BonusDraw, type BonusRacer, type CheckpointRace } from '@/domain/catch-up-bonus';
import type { GuestId } from '@/domain/guest-id';
import { drawBonusWords } from '@/domain/race-text';
import type { RoomId } from '@/domain/room-id';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';
import { botCourseIn } from './bot-course';
import { bonusesOf, textEditsOf, type RaceBonusRow } from './race-bonuses';
import { findRaceBots, findRaceParticipants, type CurrentRace, type RaceBotRow, type RaceParticipantRow } from './race-rows';
import { findTextSettings } from './room-text-settings';
import { secureRandom } from '../random';

type BonusContext = { race: CurrentRace; bonuses: readonly RaceBonusRow[]; elapsedMs: number };

// Runs under the room lock after every accepted progress report: players are where their accepted reports put them, bots where their seed puts
// them at that moment on their own text. Only this server code ever creates a bonus or draws its kind and words; no request names one (BONUS-01, COURSE-06).
export async function awardCatchUpBonuses(transaction: DatabaseTransaction, roomId: RoomId, race: CurrentRace, bonuses: readonly RaceBonusRow[], now: Date): Promise<void> {
  if (!race.catchUpBonuses || race.bonusCheckpointsPassed >= bonusCheckpoints.length) return;
  const checkpointRace = await checkpointRaceOf(transaction, { race, bonuses, elapsedMs: Math.max(0, now.getTime() - race.startsAt.getTime()) });
  if (!hasDueCheckpoint(checkpointRace)) return;
  const outcome = awardDueBonuses(checkpointRace, await secureDraw(transaction, roomId, race));
  if (outcome.awards.length > 0) await transaction.insert(schema.raceBonuses).values(outcome.awards.map((award) => bonusRowOf(race, award, now)));
  await transaction.update(schema.races).set({ bonusCheckpointsPassed: outcome.checkpointsPassed }).where(eq(schema.races.id, race.id));
}

async function checkpointRaceOf(transaction: DatabaseTransaction, context: BonusContext): Promise<CheckpointRace> {
  const participants = await findRaceParticipants(transaction, context.race.id);
  const raceBots = await findRaceBots(transaction, context.race.id);
  const racers = [...participants.map((participant) => playerRacer(participant, context)), ...raceBots.map((raceBot) => botRacer(raceBot, context))];
  return { isEnabled: context.race.catchUpBonuses, passage: context.race.passage, checkpointsPassed: context.race.bonusCheckpointsPassed, racers };
}

// "+3 mots" appends words drawn like the race's own random words: its language, level, accent switch and excluded characters, which the lobby locks during a race.
async function secureDraw(transaction: DatabaseTransaction, roomId: RoomId, race: CurrentRace): Promise<BonusDraw> {
  const settings = await findTextSettings(transaction, roomId);
  const words = () => (settings === null ? null : drawBonusWords({ ...settings, language: race.language }, raceWordLists, gameConfig.catchUpBonuses.addedWords, randomInt));
  return { kind: () => drawBonusKind(secureRandom), words };
}

function playerRacer(participant: RaceParticipantRow, { bonuses }: BonusContext): BonusRacer {
  const received = bonusesOf(bonuses, participant.guestId);
  const isOut = participant.abandonedAt !== null || participant.inactiveAt !== null;
  return { racerKey: participant.guestId, position: participant.position, isFinished: participant.finishedAt !== null, isOut, edits: textEditsOf(bonuses, participant.guestId), bonusesReceived: received.length };
}

function botRacer(raceBot: RaceBotRow, { race, bonuses, elapsedMs }: BonusContext): BonusRacer {
  const racerKey = botMemberKey(raceBot.character);
  const { position, finishMs } = botProgressAt(raceBot, botCourseIn(race, bonuses, raceBot.character), elapsedMs);
  return { racerKey, position, isFinished: finishMs !== null, isOut: false, edits: textEditsOf(bonuses, racerKey), bonusesReceived: bonusesOf(bonuses, racerKey).length };
}

function bonusRowOf(race: CurrentRace, award: BonusAward, awardedAt: Date) {
  const receiver = racerColumnsOf(award.racerKey);
  const base = { raceId: race.id, ...receiver, checkpoint: award.checkpoint, kind: award.kind, awardedAt };
  if (award.kind === 'remove-words') return { ...base, wordsRemoved: award.wordsRemoved };
  const target = racerColumnsOf(award.targetKey);
  const addedWords = award.kind === 'add-words' ? award.addedWords : null;
  return { ...base, wordsRemoved: 0, targetGuestId: target.guestId, targetBotCharacter: target.botCharacter, addedWords };
}

function racerColumnsOf(racerKey: string) {
  const botCharacter = parseBotMemberKey(racerKey);
  return { guestId: botCharacter === null ? (racerKey as GuestId) : null, botCharacter };
}
