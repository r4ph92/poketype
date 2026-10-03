import { describe, expect, it } from 'vitest';
import { botCharacters, botLevels, charactersOfLevel, type BotLevel } from '../../src/assets/bot-characters';
import { gameConfig } from '../../src/config/game';
import { botProgressAt, isBotSeed } from '../../src/domain/bot-race';
import { measureRacer } from '../../src/domain/race-results';

const seeds = [1, 42, 7_777, 123_456, 2_147_483_647, 4_294_967_295];

const fiftyWords = 50 * gameConfig.scoring.charactersPerWord;

const longEnough = 60 * 60_000;

function finishedRace(level: BotLevel, seed: number, passageLength = fiftyWords) {
  const progress = botProgressAt({ level, seed }, passageLength, longEnough);
  return { progress, metrics: measureRacer({ typedCharacters: progress.position, keystrokes: progress.keystrokes, rejectedKeystrokes: progress.rejectedKeystrokes, elapsedMs: progress.finishMs! }) };
}

describe('bot race simulation', () => {
  it.each(botLevels)('a %s bot types within 15 percent of its level speed', (level) => {
    for (const seed of seeds) {
      const { metrics } = finishedRace(level, seed);
      expect(Math.abs(metrics.grossWpm - gameConfig.bots.levels[level].wpm) / gameConfig.bots.levels[level].wpm).toBeLessThan(0.15);
    }
  });

  it.each(botLevels)('a %s bot makes at least one error over fifty words, near its error rate', (level) => {
    for (const seed of seeds) {
      const { progress, metrics } = finishedRace(level, seed);
      expect(progress.rejectedKeystrokes).toBeGreaterThanOrEqual(1);
      expect(Math.abs(1 - metrics.accuracy - gameConfig.bots.levels[level].errorRate)).toBeLessThan(0.02);
    }
  });

  it('an expert bot always beats a beginner bot', () => {
    for (const seed of seeds) {
      expect(finishedRace('expert', seed).progress.finishMs!).toBeLessThan(finishedRace('beginner', seed + 1).progress.finishMs!);
    }
  });

  it('gives the same race for the same level, seed and text, and another for another seed', () => {
    expect(botProgressAt({ level: 'medium', seed: 9 }, 400, 30_000)).toEqual(botProgressAt({ level: 'medium', seed: 9 }, 400, 30_000));
    expect(botProgressAt({ level: 'medium', seed: 9 }, 400, 30_000)).not.toEqual(botProgressAt({ level: 'medium', seed: 10 }, 400, 30_000));
  });

  it('types nothing before the start and only moves forward with time', () => {
    expect(botProgressAt({ level: 'expert', seed: 3 }, 200, 0)).toEqual({ position: 0, keystrokes: 0, rejectedKeystrokes: 0, finishMs: null });
    let previous = 0;
    for (let elapsedMs = 0; elapsedMs <= 120_000; elapsedMs += 1_000) {
      const { position } = botProgressAt({ level: 'easy', seed: 3 }, 200, elapsedMs);
      expect(position).toBeGreaterThanOrEqual(previous);
      previous = position;
    }
  });

  it('keeps the counters a server would accept and stops at the end of the text with a finish time inside the elapsed time', () => {
    const progress = botProgressAt({ level: 'hard', seed: 5 }, 120, longEnough);
    expect(progress.position).toBe(120);
    expect(progress.keystrokes - progress.rejectedKeystrokes).toBe(progress.position);
    expect(progress.finishMs).toBeGreaterThan(0);
    expect(botProgressAt({ level: 'hard', seed: 5 }, 120, progress.finishMs!)).toEqual(progress);
    expect(botProgressAt({ level: 'hard', seed: 5 }, 120, progress.finishMs! - 1).finishMs).toBeNull();
  });

  it('accepts only unsigned 32-bit seeds', () => {
    expect(isBotSeed(0)).toBe(true);
    expect(isBotSeed(4_294_967_295)).toBe(true);
    expect(isBotSeed(4_294_967_296)).toBe(false);
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

  it('pairs every expert villain boss with a legendary', () => {
    expect(charactersOfLevel('expert').map((character) => [character.id, character.pokemon])).toEqual([
      ['giovanni', 'mewtwo'],
      ['maxie', 'groudon'],
      ['archie', 'kyogre'],
      ['cyrus', 'dialga'],
      ['ghetsis', 'kyurem'],
      ['n', 'zekrom'],
    ]);
  });
});
