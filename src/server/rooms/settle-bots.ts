import { and, eq } from 'drizzle-orm';
import { botProgressAt, type BotProgress } from '@/domain/bot-race';
import { passageLength } from '@/domain/passage';
import { measureRacer, type Placed, type RacerPerformance } from '@/domain/race-results';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';
import type { CurrentRace, RaceBotRow } from './race-rows';

export type BotEntry = { kind: 'bot'; raceBot: RaceBotRow; progress: BotProgress; performance: RacerPerformance };

// Every bot is measured at the race end from its seed, like an unfinished player at the end, or at its own computed finish.
export function botEntriesAt(race: CurrentRace, raceBots: readonly RaceBotRow[], endedAt: Date): BotEntry[] {
  const raceElapsedMs = Math.max(0, endedAt.getTime() - race.startsAt.getTime());
  return raceBots.map((raceBot) => {
    const progress = botProgressAt(raceBot, passageLength(race.passage), raceElapsedMs);
    const { position, keystrokes, rejectedKeystrokes, finishMs } = progress;
    return { kind: 'bot', raceBot, progress, performance: { typedCharacters: position, keystrokes, rejectedKeystrokes, elapsedMs: finishMs ?? raceElapsedMs } };
  });
}

export async function saveBotResult(transaction: DatabaseTransaction, race: CurrentRace, { raceBot, progress, performance, place }: Placed<BotEntry>): Promise<void> {
  const { grossWpm, score, accuracy } = measureRacer(performance);
  const { position, keystrokes, rejectedKeystrokes, finishMs } = progress;
  const finishedAt = finishMs === null ? null : new Date(race.startsAt.getTime() + finishMs);
  await transaction
    .update(schema.raceBots)
    .set({ position, keystrokes, rejectedKeystrokes, finishedAt, grossWpm, score, accuracy, place })
    .where(and(eq(schema.raceBots.raceId, race.id), eq(schema.raceBots.character, raceBot.character)));
}
