import { describe, expect, it } from 'vitest';
import { botCharacters, botLevels, charactersOfLevel } from '../../src/assets/bot-characters';
import { gameConfig } from '../../src/config/game';
import { botProgressAt, isBotSeed } from '../../src/domain/bot-race';
import { readBotText } from '../../src/domain/bot-text';
import { errorModes } from '../../src/domain/text-settings';
import { average, characterDurations, correctCharactersByWindow, courseOf, finishedBotRace, keystrokesOf, raceText } from './support/bot-races';

const seeds = Array.from({ length: 20 }, (_, index) => index * 7_919 + 1);

const longEnough = 60 * 60_000;

const windowMs = 5_000;

// Many seeds spread over the generator's range, so a rare rhythm that hides the variation would show.
const variationSeeds = Array.from({ length: 40 }, (_, index) => 100_003 + index * 104_729);

function variationOf(windows: readonly number[]): number {
  return (Math.max(...windows) - Math.min(...windows)) / average(windows);
}

describe('bot levels', () => {
  describe.each(errorModes)('in %s mode', (errorMode) => {
    it.each(botLevels)('a %s bot averages a net WPM inside its range and errs at its rate over 20 seeded races', (level) => {
      const races = seeds.map((seed) => finishedBotRace(level, seed, courseOf(raceText(seed), errorMode)));
      const { wpmRange, errorRate } = gameConfig.bots.levels[level];
      const meanWpm = average(races.map((race) => race.grossWpm));
      expect(meanWpm).toBeGreaterThanOrEqual(wpmRange.min);
      if (wpmRange.max !== null) expect(meanWpm).toBeLessThanOrEqual(wpmRange.max);
      expect(Math.abs(average(races.map((race) => 1 - race.accuracy)) - errorRate)).toBeLessThanOrEqual(0.02);
    });
  });

  it('an impossible bot always beats a noob bot', () => {
    for (const seed of seeds) {
      const course = courseOf(raceText(seed));
      expect(finishedBotRace('impossible', seed, course).finishMs).toBeLessThan(finishedBotRace('noob', seed + 1, course).finishMs);
    }
  });
});

describe('human-like typing', () => {
  describe.each(errorModes)('in %s mode', (errorMode) => {
    it.each(botLevels)('a %s bot changes speed by at least 15 percent between 5-second windows on the default text', (level) => {
      for (const seed of variationSeeds) {
        const windows = correctCharactersByWindow(keystrokesOf(level, seed, courseOf(raceText(seed), errorMode)), windowMs);
        expect(windows.length).toBeGreaterThanOrEqual(2);
        expect(variationOf(windows)).toBeGreaterThanOrEqual(0.15);
      }
    });

    it.each(botLevels)('a %s bot still changes speed between 5-second windows on a 10-word text that lasts two of them or more', (level) => {
      for (const seed of variationSeeds) {
        const windows = correctCharactersByWindow(keystrokesOf(level, seed, courseOf(raceText(seed, 10), errorMode)), windowMs);
        if (windows.length >= 2) expect(variationOf(windows)).toBeGreaterThanOrEqual(0.15);
      }
    });
  });

  it.each(botLevels)('a %s bot takes longer per character on words of 8 letters or more than on short words', (level) => {
    for (const seed of seeds) {
      const text = raceText(seed, 100, 'hard');
      const durations = characterDurations(keystrokesOf(level, seed, courseOf(text)));
      const characters = readBotText(text);
      const longWordMs = average(durations.filter((_, index) => characters[index]!.inLongWord));
      const shortWordMs = average(durations.filter((_, index) => !characters[index]!.inLongWord && text[index] !== ' '));
      expect(longWordMs).toBeGreaterThan(shortWordMs);
    }
  });

  it('reads letters only when it measures a word, so punctuation and elisions never make a word long', () => {
    expect(readBotText("l'arbre, magnifique").map((character) => character.inLongWord)).toEqual([...Array(9).fill(false), ...Array(10).fill(true)]);
    expect(readBotText('le chat').map((character) => character.startsWord)).toEqual([true, false, false, true, false, false, false]);
  });
});

describe('mistakes', () => {
  it('in "Correction obligatoire", holds the cursor on a mistake and loses time fixing it before the next keystroke', () => {
    const gapsAfter = { mistake: [] as number[], correct: [] as number[] };
    for (const seed of seeds) {
      const keystrokes = keystrokesOf('noob', seed, courseOf(raceText(seed)));
      keystrokes.slice(1).forEach((keystroke, index) => {
        const previous = keystrokes[index]!;
        const before = index === 0 ? { rejectedKeystrokes: 0, position: 0 } : keystrokes[index - 1]!;
        const wasMistake = previous.rejectedKeystrokes > before.rejectedKeystrokes;
        if (wasMistake) expect(previous.position).toBe(before.position);
        gapsAfter[wasMistake ? 'mistake' : 'correct'].push(keystroke.elapsedMs - previous.elapsedMs);
      });
    }
    expect(average(gapsAfter.mistake)).toBeGreaterThan(1.5 * average(gapsAfter.correct));
  });

  it('in "Libre", moves on past a mistake, counts it and leaves it out of the correct characters', () => {
    const text = raceText(3);
    const progress = botProgressAt({ level: 'noob', seed: 3 }, courseOf(text, 'free'), longEnough);
    expect(progress.position).toBe(text.length);
    expect(progress.keystrokes).toBe(text.length);
    expect(progress.rejectedKeystrokes).toBeGreaterThan(0);
    expect(progress.correctCharacters).toBe(progress.position - progress.rejectedKeystrokes);
  });

  it('finishes sooner in "Libre" than in "Correction obligatoire", which spends time on every mistake', () => {
    const finishIn = (errorMode: 'blocked' | 'free') => average(seeds.map((seed) => finishedBotRace('noob', seed, courseOf(raceText(seed), errorMode)).finishMs));
    expect(finishIn('free')).toBeLessThan(finishIn('blocked'));
  });
});

describe('bot race simulation', () => {
  it('gives exactly the same race for the same level, seed and text, and another for another seed', () => {
    const course = courseOf(raceText(9));
    expect(keystrokesOf('intermediate', 9, course)).toEqual(keystrokesOf('intermediate', 9, course));
    expect(keystrokesOf('intermediate', 10, course)).not.toEqual(keystrokesOf('intermediate', 9, course));
  });

  it('types nothing before the start and only moves forward with time', () => {
    const course = courseOf(raceText(3));
    expect(botProgressAt({ level: 'impossible', seed: 3 }, course, 0)).toEqual({ position: 0, correctCharacters: 0, keystrokes: 0, rejectedKeystrokes: 0, finishMs: null });
    let previous = 0;
    for (let elapsedMs = 0; elapsedMs <= 120_000; elapsedMs += 1_000) {
      const { position } = botProgressAt({ level: 'novice', seed: 3 }, course, elapsedMs);
      expect(position).toBeGreaterThanOrEqual(previous);
      previous = position;
    }
  });

  it('keeps the counters a server would accept and stops at the end of the text with a finish time inside the elapsed time', () => {
    const course = courseOf(raceText(5, 20));
    const length = Array.from(course.text).length;
    const progress = botProgressAt({ level: 'expert', seed: 5 }, course, longEnough);
    expect(progress.position).toBe(length);
    expect(progress.keystrokes - progress.rejectedKeystrokes).toBe(progress.position);
    expect(progress.correctCharacters).toBe(progress.position);
    expect(progress.finishMs).toBeGreaterThan(0);
    expect(botProgressAt({ level: 'expert', seed: 5 }, course, progress.finishMs!)).toEqual(progress);
    expect(botProgressAt({ level: 'expert', seed: 5 }, course, progress.finishMs! - 1).finishMs).toBeNull();
  });

  it('types a shortened text exactly like the start of the full one, so a catch-up bonus never moves a bot back', () => {
    const text = raceText(11);
    const shortened = text.slice(0, text.lastIndexOf(' '));
    const full = keystrokesOf('novice', 11, courseOf(text));
    const short = keystrokesOf('novice', 11, courseOf(shortened));
    expect(full.slice(0, short.length)).toEqual(short);
  });

  it('accepts only seeds that fit a database integer', () => {
    expect(isBotSeed(0)).toBe(true);
    expect(isBotSeed(2_147_483_647)).toBe(true);
    expect(isBotSeed(2_147_483_648)).toBe(false);
    expect(isBotSeed(-1)).toBe(false);
    expect(isBotSeed(1.5)).toBe(false);
    expect(isBotSeed('1')).toBe(false);
  });
});

describe('bot roster', () => {
  it('names every character once, with a French and an English name', () => {
    expect(new Set(botCharacters.map((character) => character.id)).size).toBe(botCharacters.length);
    for (const { name } of botCharacters) {
      expect(name.fr.length).toBeGreaterThan(0);
      expect(name.en.length).toBeGreaterThan(0);
    }
  });

  it('offers several characters at every level', () => {
    for (const level of botLevels) expect(charactersOfLevel(level).length).toBeGreaterThanOrEqual(5);
  });

  it('pairs every impossible villain boss with a legendary', () => {
    expect(charactersOfLevel('impossible').map((character) => [character.id, character.pokemon])).toEqual([
      ['giovanni', 'mewtwo'],
      ['maxie', 'groudon'],
      ['archie', 'kyogre'],
      ['cyrus', 'dialga'],
      ['ghetsis', 'kyurem'],
      ['n', 'zekrom'],
    ]);
  });
});
