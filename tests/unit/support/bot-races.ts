import { raceWordLists } from '../../../src/assets/word-lists';
import type { BotLevel } from '../../../src/assets/bot-characters';
import { botProgressAt, type BotCourse } from '../../../src/domain/bot-race';
import { botKeystrokes, type BotKeystroke } from '../../../src/domain/bot-typist';
import { generateRaceText } from '../../../src/domain/race-text';
import type { ComplexityLevel } from '../../../src/domain/text-complexity';
import { measureRacer, type RacerMetrics } from '../../../src/domain/race-results';
import { defaultTextSettings, type ErrorMode } from '../../../src/domain/text-settings';
import { seededRandom } from './seeded-random';

const longEnoughMs = 60 * 60_000;

// A text the lobby would draw with the default settings, so the bots are measured on what children race on.
export function raceText(seed: number, wordCount = 60, complexity: ComplexityLevel = defaultTextSettings('fr').complexity): string {
  return generateRaceText({ ...defaultTextSettings('fr'), wordCount, complexity }, raceWordLists, seededRandom(seed))!;
}

export function finishedBotRace(level: BotLevel, seed: number, course: BotCourse): RacerMetrics & { finishMs: number } {
  const progress = botProgressAt({ level, seed }, course, longEnoughMs);
  const metrics = measureRacer({ typedCharacters: progress.correctCharacters, keystrokes: progress.keystrokes, rejectedKeystrokes: progress.rejectedKeystrokes, elapsedMs: progress.finishMs! });
  return { ...metrics, finishMs: progress.finishMs! };
}

export function courseOf(text: string, errorMode: ErrorMode = 'blocked'): BotCourse {
  return { text, errorMode };
}

export function keystrokesOf(level: BotLevel, seed: number, course: BotCourse): BotKeystroke[] {
  return [...botKeystrokes({ level, seed }, course)];
}

export function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

// Correct characters gained in each whole windowMs of the race, from the start to the finish.
export function correctCharactersByWindow(keystrokes: readonly BotKeystroke[], windowMs: number): number[] {
  const windowCount = Math.floor(keystrokes.at(-1)!.elapsedMs / windowMs);
  const gained = Array<number>(windowCount).fill(0);
  let previous = 0;
  for (const keystroke of keystrokes) {
    const window = Math.floor(keystroke.elapsedMs / windowMs);
    if (window < windowCount) gained[window]! += keystroke.correctCharacters - previous;
    previous = keystroke.correctCharacters;
  }
  return gained;
}

// The time each character of the text took, from the moment the cursor reached it to the moment it moved past it.
export function characterDurations(keystrokes: readonly BotKeystroke[]): number[] {
  const reachedAt = [0];
  for (const keystroke of keystrokes) if (keystroke.position === reachedAt.length) reachedAt.push(keystroke.elapsedMs);
  return reachedAt.slice(1).map((movedAt, index) => movedAt - reachedAt[index]!);
}
