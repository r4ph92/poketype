import type { BotLevel } from '@/assets/bot-characters';
import { gameConfig } from '@/config/game';
import { readBotText, type BotTextCharacter } from './bot-text';
import type { RandomSource } from './random-source';
import { aroundOne, between, midpoint, seededRandom } from './seeded-random';
import type { ErrorMode } from './text-settings';

// seed is drawn by the server when the race starts; the same level, seed and course always type the same race.
export type BotRacer = { level: BotLevel; seed: number };

// The bot's own text (the passage, shorter by its catch-up bonuses) and the race's error mode.
export type BotCourse = { text: string; errorMode: ErrorMode };

// The counters after one keystroke and its time from the race start, in whole milliseconds.
export type BotKeystroke = { position: number; correctCharacters: number; keystrokes: number; rejectedKeystrokes: number; elapsedMs: number };

// speedFactor is the current burst (above 1) or slow stretch (below 1); phases alternate and each lasts until phaseEndsMs.
type Typist = { keystrokeMs: number; errorRate: number; speedFactor: number; isBurst: boolean; phaseEndsMs: number };

const millisecondsPerMinute = 60_000;

// Every keystroke the bot types until the end of its text. Each draw comes from the seed in a fixed order, so the race is a pure function of its inputs.
export function* botKeystrokes(racer: BotRacer, course: BotCourse): Generator<BotKeystroke> {
  const random = seededRandom(racer.seed);
  const text = readBotText(course.text);
  const typist = startTypist(racer.level, random);
  const typed: BotKeystroke = { position: 0, correctCharacters: 0, keystrokes: 0, rejectedKeystrokes: 0, elapsedMs: 0 };
  let pauseMs = 0;
  let startedWordAt = -1;
  while (typed.position < text.length) {
    changePhaseWhenDue(typist, typed.elapsedMs, random);
    const character = text[typed.position]!;
    if (character.startsWord && startedWordAt !== typed.position) {
      startedWordAt = typed.position;
      pauseMs += hesitation(typist, random);
    }
    typed.elapsedMs += Math.round(pauseMs + keystrokeMs(typist, character, random));
    pauseMs = typeKeystroke(typed, typist, course.errorMode, random);
    yield { ...typed };
  }
}

// The keystroke time is set so that, on the calibration text, the level averages its target net speed with every pause and correction included.
function startTypist(level: BotLevel, random: RandomSource): Typist {
  const { targetWpm, errorRate } = gameConfig.bots.levels[level];
  const pace = aroundOne(random, gameConfig.bots.paceVariation);
  const correctCharacterMs = millisecondsPerMinute / (targetWpm * gameConfig.scoring.charactersPerWord);
  const keystrokeMs = correctCharacterMs / keystrokesPerCorrectCharacter(errorRate) / pace;
  return { keystrokeMs, errorRate, speedFactor: 1, isBurst: random() < 0.5, phaseEndsMs: 0 };
}

// The expected time per correct character, counted in keystroke times.
function keystrokesPerCorrectCharacter(errorRate: number): number {
  const { longWord, correctionKeystrokes, hesitation, calibration } = gameConfig.bots;
  const typing = (1 + calibration.longWordCharacterShare * (longWord.slowdown - 1)) / (1 - errorRate);
  const correcting = (errorRate / (1 - errorRate)) * midpoint(correctionKeystrokes);
  const hesitating = (hesitation.slowWordChance * slowWordShare() * midpoint(hesitation.keystrokes)) / calibration.charactersPerWord;
  return typing + correcting + hesitating;
}

// Slow stretches and bursts last the same time on average, so the slow ones hold fewer words: (1 − swing) ÷ 2 of them.
function slowWordShare(): number {
  return (1 - midpoint(gameConfig.bots.rhythm.speedSwing)) / 2;
}

// In a slow stretch a new word may come after a hesitation; a burst flows without one.
function hesitation(typist: Typist, random: RandomSource): number {
  if (typist.isBurst) return 0;
  const { slowWordChance, keystrokes } = gameConfig.bots.hesitation;
  return random() < slowWordChance ? typist.keystrokeMs * between(random, keystrokes) : 0;
}

// Bursts and slow stretches alternate and last a few seconds whatever the bot's speed, so a fast bot varies over 5-second windows as much as a slow one.
// Their swings are symmetric around 1 and their durations do not depend on them, so over time they average the level's speed.
function changePhaseWhenDue(typist: Typist, elapsedMs: number, random: RandomSource): void {
  if (elapsedMs < typist.phaseEndsMs) return;
  const { phaseMs, speedSwing } = gameConfig.bots.rhythm;
  typist.isBurst = !typist.isBurst;
  typist.speedFactor = 1 + (typist.isBurst ? 1 : -1) * between(random, speedSwing);
  typist.phaseEndsMs = elapsedMs + between(random, phaseMs);
}

function keystrokeMs(typist: Typist, character: BotTextCharacter, random: RandomSource): number {
  const { longWord, keystrokeJitter } = gameConfig.bots;
  const wordFactor = character.inLongWord ? longWord.slowdown : 1;
  return (typist.keystrokeMs * wordFactor * aroundOne(random, keystrokeJitter)) / typist.speedFactor;
}

// Returns the pause before the next keystroke: "Correction obligatoire" holds the cursor and costs time to fix the mistake; "Libre" moves on with the mistake left in.
function typeKeystroke(typed: BotKeystroke, typist: Typist, errorMode: ErrorMode, random: RandomSource): number {
  typed.keystrokes += 1;
  if (random() >= typist.errorRate) {
    typed.position += 1;
    typed.correctCharacters += 1;
    return 0;
  }
  typed.rejectedKeystrokes += 1;
  if (errorMode === 'free') {
    typed.position += 1;
    return 0;
  }
  return typist.keystrokeMs * between(random, gameConfig.bots.correctionKeystrokes);
}
