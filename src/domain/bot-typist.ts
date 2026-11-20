import type { BotLevel } from '@/assets/bot-characters';
import { gameConfig } from '@/config/game';
import { readBotText, type BotTextCharacter } from './bot-text';
import type { RandomSource } from './random-source';
import { aroundOne, between, midpoint, seededRandom, wholeBetween } from './seeded-random';
import type { ErrorMode } from './text-settings';

// seed is drawn by the server when the race starts; the same level, seed and course always type the same race.
export type BotRacer = { level: BotLevel; seed: number };

// The bot's own text (the passage, shorter by its catch-up bonuses) and the race's error mode.
export type BotCourse = { text: string; errorMode: ErrorMode };

// The counters after one keystroke and its time from the race start, in whole milliseconds.
export type BotKeystroke = { position: number; correctCharacters: number; keystrokes: number; rejectedKeystrokes: number; elapsedMs: number };

type Typist = { keystrokeMs: number; errorRate: number; phaseFactor: number; wordsLeftInPhase: number };

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
    const character = text[typed.position]!;
    if (character.startsWord && startedWordAt !== typed.position) {
      startedWordAt = typed.position;
      pauseMs += startWord(typist, random);
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
  return { keystrokeMs: correctCharacterMs / keystrokesPerCorrectCharacter(errorRate) / pace, errorRate, phaseFactor: 1, wordsLeftInPhase: 0 };
}

// The expected time per correct character, counted in keystroke times.
function keystrokesPerCorrectCharacter(errorRate: number): number {
  const { longWord, correctionKeystrokes, hesitation, calibration } = gameConfig.bots;
  const typing = (1 + calibration.longWordCharacterShare * (longWord.slowdown - 1)) / (1 - errorRate);
  const correcting = (errorRate / (1 - errorRate)) * midpoint(correctionKeystrokes);
  const hesitating = (hesitation.wordChance * midpoint(hesitation.keystrokes)) / calibration.charactersPerWord;
  return typing + correcting + hesitating;
}

// A new word may start a burst or a slow stretch, and may come after a hesitation.
function startWord(typist: Typist, random: RandomSource): number {
  changePhaseWhenDue(typist, random);
  const { wordChance, keystrokes } = gameConfig.bots.hesitation;
  return random() < wordChance ? typist.keystrokeMs * between(random, keystrokes) : 0;
}

function changePhaseWhenDue(typist: Typist, random: RandomSource): void {
  if (typist.wordsLeftInPhase > 0) {
    typist.wordsLeftInPhase -= 1;
    return;
  }
  const { phaseSpread, phaseWords } = gameConfig.bots.rhythm;
  typist.phaseFactor = aroundOne(random, phaseSpread);
  typist.wordsLeftInPhase = wholeBetween(random, phaseWords) - 1;
}

function keystrokeMs(typist: Typist, character: BotTextCharacter, random: RandomSource): number {
  const { longWord, keystrokeJitter } = gameConfig.bots;
  const wordFactor = character.inLongWord ? longWord.slowdown : 1;
  return typist.keystrokeMs * typist.phaseFactor * wordFactor * aroundOne(random, keystrokeJitter);
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
