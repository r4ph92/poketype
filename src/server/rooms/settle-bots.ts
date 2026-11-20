import { and, eq } from 'drizzle-orm';
import { botProgressAt, type BotProgress } from '@/domain/bot-race';
import { measureRacer, type Placed, type RaceOutcome, type RacerPerformance } from '@/domain/race-results';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';
import { botCourseIn } from './bot-course';
import type { RaceBonusRow } from './race-bonuses';
import type { CurrentRace, RaceBotRow } from './race-rows';

export type BotEntry = { kind: 'bot'; raceBot: RaceBotRow; progress: BotProgress; outcome: RaceOutcome; performance: RacerPerformance };

// Every bot is measured at the race end from its seed on its own text, like an unfinished player at the end, or at its own computed finish. A bot never abandons.
// Like a player's, its speed counts correct characters only, so a mistake a "Libre" race left in the text never counts (#32).
export function botEntriesAt(race: CurrentRace, raceBots: readonly RaceBotRow[], endedAt: Date, bonuses: readonly RaceBonusRow[]): BotEntry[] {
  const raceElapsedMs = Math.max(0, endedAt.getTime() - race.startsAt.getTime());
  return raceBots.map((raceBot) => {
    const progress = botProgressAt(raceBot, botCourseIn(race, bonuses, raceBot.character), raceElapsedMs);
    const { correctCharacters, keystrokes, rejectedKeystrokes, finishMs } = progress;
    const outcome: RaceOutcome = finishMs === null ? 'timedOut' : 'finished';
    return { kind: 'bot', raceBot, progress, outcome, performance: { typedCharacters: correctCharacters, keystrokes, rejectedKeystrokes, elapsedMs: finishMs ?? raceElapsedMs } };
  });
}

export async function saveBotResult(transaction: DatabaseTransaction, race: CurrentRace, { raceBot, progress, performance, place }: Placed<BotEntry>): Promise<void> {
  const { grossWpm, rawWpm, score, accuracy } = measureRacer(performance);
  const { position, keystrokes, rejectedKeystrokes, finishMs } = progress;
  const finishedAt = finishMs === null ? null : new Date(race.startsAt.getTime() + finishMs);
  await transaction
    .update(schema.raceBots)
    .set({ position, keystrokes, rejectedKeystrokes, finishedAt, grossWpm, rawWpm, score, accuracy, place })
    .where(and(eq(schema.raceBots.raceId, race.id), eq(schema.raceBots.character, raceBot.character)));
}
