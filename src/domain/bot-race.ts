import { gameConfig } from '@/config/game';
import type { ErrorMode } from './text-settings';
import { botKeystrokes, type BotCourse, type BotKeystroke, type BotRacer } from './bot-typist';

export type { BotCourse, BotRacer } from './bot-typist';

// The counters a human's accepted reports would hold, and the finish time measured from the race start.
// position is the cursor; correctCharacters leaves out the mistakes a "Libre" race keeps in the text.
export type BotProgress = { position: number; correctCharacters: number; keystrokes: number; rejectedKeystrokes: number; finishMs: number | null };

const notStarted: BotKeystroke = { position: 0, correctCharacters: 0, keystrokes: 0, rejectedKeystrokes: 0, elapsedMs: 0 };

// A pure function of elapsed time, in whole milliseconds, so the server settles exactly what every race view draws, with no process running the bots.
export function botProgressAt(racer: BotRacer, course: BotCourse, elapsedMs: number): BotProgress {
  let typed = notStarted;
  for (const keystroke of botKeystrokes(racer, course)) {
    if (keystroke.elapsedMs > elapsedMs) return progressOf(typed, false);
    typed = keystroke;
  }
  return progressOf(typed, true);
}

// The bot's correct characters at the end of each whole sample of its race up to stopMs (#147), from the same keystrokes its progress reads: never stored.
export function botCorrectCharactersBySample(racer: BotRacer, course: BotCourse, stopMs: number): number[] {
  const { sampleMs } = gameConfig.wpmTimeline;
  const sampleCount = Math.floor(Math.max(0, stopMs) / sampleMs);
  const samples: number[] = [];
  let correctCharacters = 0;
  for (const keystroke of botKeystrokes(racer, course)) {
    while (samples.length < sampleCount && (samples.length + 1) * sampleMs < keystroke.elapsedMs) samples.push(correctCharacters);
    if (samples.length === sampleCount) return samples;
    correctCharacters = keystroke.correctCharacters;
  }
  return [...samples, ...Array<number>(sampleCount - samples.length).fill(correctCharacters)];
}

// A bot never goes back, so in "Libre" every mistake it made is still in the text.
export function settledBotCorrectCharacters({ position, rejectedKeystrokes }: { position: number | null; rejectedKeystrokes: number | null }, errorMode: ErrorMode): number {
  if (position === null) return 0;
  return errorMode === 'free' ? position - (rejectedKeystrokes ?? 0) : position;
}

function progressOf({ position, correctCharacters, keystrokes, rejectedKeystrokes, elapsedMs }: BotKeystroke, isFinished: boolean): BotProgress {
  return { position, correctCharacters, keystrokes, rejectedKeystrokes, finishMs: isFinished ? elapsedMs : null };
}

// Seeds fit a Postgres integer column.
export const botSeedLimit = 2 ** 31;

export function isBotSeed(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value < botSeedLimit;
}
