import type { BotLevel } from '@/assets/bot-characters';
import { gameConfig } from '@/config/game';
import type { RandomSource } from './random-source';

// seed is drawn by the server when the race starts; the same level, seed and passage always type the same race.
export type BotRacer = { level: BotLevel; seed: number };

// The counters a human's accepted reports would hold, and the finish time measured from the race start.
export type BotProgress = { position: number; keystrokes: number; rejectedKeystrokes: number; finishMs: number | null };

type Typing = { position: number; keystrokes: number; rejectedKeystrokes: number; elapsedMs: number };

const millisecondsPerMinute = 60_000;

const uint32Range = 2 ** 32;

// A pure function of elapsed time, in whole milliseconds, so the server settles exactly what every race view draws, with no process running the bots.
export function botProgressAt(racer: BotRacer, passageLength: number, elapsedMs: number): BotProgress {
  let typed: Typing = { position: 0, keystrokes: 0, rejectedKeystrokes: 0, elapsedMs: 0 };
  for (const keystroke of botKeystrokes(racer, passageLength)) {
    if (keystroke.elapsedMs > elapsedMs) break;
    typed = keystroke;
  }
  const { position, keystrokes, rejectedKeystrokes } = typed;
  return { position, keystrokes, rejectedKeystrokes, finishMs: position === passageLength ? typed.elapsedMs : null };
}

// The bot's position at the end of each whole sample of its race up to stopMs (#147), from the same keystrokes its progress reads: never stored.
export function botCorrectCharactersBySample(racer: BotRacer, passageLength: number, stopMs: number): number[] {
  const { sampleMs } = gameConfig.wpmTimeline;
  const sampleCount = Math.floor(Math.max(0, stopMs) / sampleMs);
  const samples: number[] = [];
  let position = 0;
  for (const keystroke of botKeystrokes(racer, passageLength)) {
    while (samples.length < sampleCount && (samples.length + 1) * sampleMs < keystroke.elapsedMs) samples.push(position);
    if (samples.length === sampleCount) return samples;
    position = keystroke.position;
  }
  return [...samples, ...Array<number>(sampleCount - samples.length).fill(position)];
}

// Every keystroke the bot types until the end of the passage, each with the counters after it and its time from the start.
function* botKeystrokes(racer: BotRacer, passageLength: number): Generator<Typing> {
  const random = seededRandom(racer.seed);
  const keystrokeMs = averageKeystrokeMs(racer.level, random);
  const typing = { position: 0, keystrokes: 0, rejectedKeystrokes: 0, elapsedMs: 0, errorBudget: random() };
  while (typing.position < passageLength) {
    typing.elapsedMs += Math.round(keystrokeMs * (1 + spread(random, gameConfig.bots.keystrokeJitter)));
    typeKeystroke(typing, errorChance(racer.level, random));
    yield { position: typing.position, keystrokes: typing.keystrokes, rejectedKeystrokes: typing.rejectedKeystrokes, elapsedMs: typing.elapsedMs };
  }
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

function typeKeystroke(typing: Typing & { errorBudget: number }, errorShare: number): void {
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
