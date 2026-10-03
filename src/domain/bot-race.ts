import type { BotLevel } from '@/assets/bot-characters';
import { gameConfig } from '@/config/game';
import type { RandomSource } from './random-source';

// seed is drawn by the server when the race starts; the same level, seed and passage always type the same race.
export type BotRacer = { level: BotLevel; seed: number };

// The counters a human's accepted reports would hold, and the finish time measured from the race start.
export type BotProgress = { position: number; keystrokes: number; rejectedKeystrokes: number; finishMs: number | null };

type Typing = BotProgress & { elapsedMs: number; errorBudget: number };

const millisecondsPerMinute = 60_000;

const uint32Range = 2 ** 32;

// A pure function of elapsed time, in whole milliseconds, so the server settles exactly what every race view draws, with no process running the bots.
export function botProgressAt(racer: BotRacer, passageLength: number, elapsedMs: number): BotProgress {
  const random = seededRandom(racer.seed);
  const keystrokeMs = averageKeystrokeMs(racer.level, random);
  const typing: Typing = { position: 0, keystrokes: 0, rejectedKeystrokes: 0, finishMs: null, elapsedMs: 0, errorBudget: random() };
  while (typing.position < passageLength) {
    const nextKeystrokeAt = typing.elapsedMs + Math.round(keystrokeMs * (1 + spread(random, gameConfig.bots.keystrokeJitter)));
    if (nextKeystrokeAt > elapsedMs) break;
    typeKeystroke(typing, nextKeystrokeAt, errorChance(racer.level, random));
  }
  const { position, keystrokes, rejectedKeystrokes } = typing;
  return { position, keystrokes, rejectedKeystrokes, finishMs: position === passageLength ? typing.elapsedMs : null };
}

// Seeds fit a Postgres integer column.
export const botSeedLimit = 2 ** 31;

export function isBotSeed(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value < botSeedLimit;
}

// Wrong keystrokes cost time too, so the keystroke rate is raised until the accepted characters average the level's speed.
function averageKeystrokeMs(level: BotLevel, random: RandomSource): number {
  const { wpm, errorRate } = gameConfig.bots.levels[level];
  const pace = 1 + spread(random, gameConfig.bots.paceVariation);
  return ((millisecondsPerMinute / (wpm * gameConfig.scoring.charactersPerWord)) * (1 - errorRate)) / pace;
}

// The error budget fills by about errorRate a keystroke, so errors are never zero over a long text yet never come in bursts.
function errorChance(level: BotLevel, random: RandomSource): number {
  return gameConfig.bots.levels[level].errorRate * (0.5 + random());
}

function typeKeystroke(typing: Typing, at: number, errorShare: number): void {
  typing.elapsedMs = at;
  typing.keystrokes += 1;
  typing.errorBudget += errorShare;
  if (typing.errorBudget < 1) {
    typing.position += 1;
    return;
  }
  typing.errorBudget -= 1;
  typing.rejectedKeystrokes += 1;
}

function spread(random: RandomSource, fraction: number): number {
  return (random() * 2 - 1) * fraction;
}

// mulberry32: a tiny generator that gives the browser and the server the same sequence for a seed.
function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / uint32Range;
  };
}
