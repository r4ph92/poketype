import { eq } from 'drizzle-orm';
import { botMemberKey } from '@/domain/bot-member';
import { botCorrectCharactersBySample } from '@/domain/bot-race';
import type { GuestId } from '@/domain/guest-id';
import type { RaceId } from '@/domain/race';
import { parseStoredSamples, timelinePoints, type RaceWpmTimelines, type RacerStop, type RacerWpmTimeline } from '@/domain/wpm-timeline';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';
import { racerTextLengthIn, type RaceBonusRow } from './race-bonuses';
import { participantStoppedAt, type CurrentRace, type RaceBotRow, type RaceParticipantRow } from './race-rows';

// A settled race and its racers as the results name them: memberKeys gives each participant's result key; bonuses give each bot its own text length.
export type SettledRaceRacers = { race: CurrentRace; endedAt: Date; participants: readonly RaceParticipantRow[]; raceBots: readonly RaceBotRow[]; bonuses: readonly RaceBonusRow[]; memberKeys: ReadonlyMap<GuestId, string> };

const unrecorded: RaceWpmTimelines = { kind: 'unrecorded' };

// A player's timeline comes from the samples stored with their accepted reports, a bot's from its seed; each stops where the results froze the racer.
// The samples are read here only, never with the snapshot every race view polls.
export async function findRaceWpmTimelines(executor: DatabaseExecutor, racers: SettledRaceRacers): Promise<RaceWpmTimelines> {
  const storedSamples = await findStoredSamples(executor, racers.race.id);
  if (racers.participants.some((participant) => !storedSamples.get(participant.guestId))) return unrecorded;
  const players = racers.participants.flatMap((participant) => playerTimeline(participant, storedSamples.get(participant.guestId) ?? [], racers) ?? []);
  return { kind: 'recorded', racers: [...players, ...racers.raceBots.map((raceBot) => botTimeline(raceBot, racers))] };
}

async function findStoredSamples(executor: DatabaseExecutor, raceId: RaceId): Promise<Map<GuestId, number[] | null>> {
  const rows = await executor
    .select({ guestId: schema.raceParticipants.guestId, samples: schema.raceParticipants.correctCharactersBySecond })
    .from(schema.raceParticipants)
    .where(eq(schema.raceParticipants.raceId, raceId));
  return new Map(rows.map((row) => [row.guestId, parseStoredSamples(row.samples)]));
}

function playerTimeline(participant: RaceParticipantRow, samples: readonly number[], racers: SettledRaceRacers): RacerWpmTimeline | null {
  const memberKey = racers.memberKeys.get(participant.guestId);
  if (memberKey === undefined) return null;
  const stop: RacerStop = { stopMs: elapsedMsAt(participantStoppedAt(participant, racers.endedAt), racers.race), correctCharacters: participant.correctCharacters };
  return { memberKey, points: timelinePoints(samples, stop) };
}

// A bot stopped at its finish or at the race end, at the position its settled row froze, typing its own text as catch-up bonuses left it.
function botTimeline(raceBot: RaceBotRow, { race, endedAt, bonuses }: SettledRaceRacers): RacerWpmTimeline {
  const stop: RacerStop = { stopMs: elapsedMsAt(raceBot.finishedAt ?? endedAt, race), correctCharacters: raceBot.position ?? 0 };
  const memberKey = botMemberKey(raceBot.character);
  const samples = botCorrectCharactersBySample(raceBot, racerTextLengthIn(race, bonuses, memberKey), stop.stopMs);
  return { memberKey, points: timelinePoints(samples, stop) };
}

function elapsedMsAt(moment: Date, race: CurrentRace): number {
  return Math.max(0, moment.getTime() - race.startsAt.getTime());
}
