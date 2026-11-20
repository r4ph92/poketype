import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { botCorrectCharactersBySample, botProgressAt, settledBotCorrectCharacters, type BotCourse, type BotRacer } from '../../src/domain/bot-race';
import { raceText } from './support/bot-races';

const { sampleMs } = gameConfig.wpmTimeline;
const course: BotCourse = { text: raceText(1, 30), errorMode: 'blocked' };
const bot: BotRacer = { level: 'intermediate', seed: 4_242 };

describe('botCorrectCharactersBySample', () => {
  it('recomputes from the seed the correct characters the bot had at the end of each second, without any stored sample', () => {
    const samples = botCorrectCharactersBySample(bot, course, 20_500);
    expect(samples).toHaveLength(20);
    samples.forEach((correct, index) => expect(correct).toBe(botProgressAt(bot, course, (index + 1) * sampleMs).correctCharacters));
  });

  it('counts only correct characters in "Libre", where mistakes move the cursor', () => {
    const free: BotCourse = { ...course, errorMode: 'free' };
    const noob: BotRacer = { level: 'noob', seed: 5 };
    const samples = botCorrectCharactersBySample(noob, free, 60_000);
    samples.forEach((correct, index) => expect(correct).toBe(botProgressAt(noob, free, (index + 1) * sampleMs).correctCharacters));
    const progress = botProgressAt(noob, free, 60_000);
    expect(progress.correctCharacters).toBeLessThan(progress.position);
  });

  it('gives the same series for the same seed and another for another seed', () => {
    expect(botCorrectCharactersBySample(bot, course, 15_000)).toEqual(botCorrectCharactersBySample({ ...bot }, course, 15_000));
    expect(botCorrectCharactersBySample({ ...bot, seed: 7 }, course, 15_000)).not.toEqual(botCorrectCharactersBySample(bot, course, 15_000));
  });

  it('holds the finished position until the stop, and nothing before the first second', () => {
    const short: BotCourse = { text: 'le chat dort sur le lit', errorMode: 'blocked' };
    const finishMs = botProgressAt(bot, short, 60_000).finishMs!;
    const samples = botCorrectCharactersBySample(bot, short, finishMs + 3 * sampleMs);
    expect(samples.at(-1)).toBe(short.text.length);
    expect(botCorrectCharactersBySample(bot, course, 900)).toEqual([]);
  });
});

describe('settledBotCorrectCharacters', () => {
  it('reads the frozen row: the position in "Correction obligatoire", the position less the mistakes left in "Libre"', () => {
    expect(settledBotCorrectCharacters({ position: 40, rejectedKeystrokes: 3 }, 'blocked')).toBe(40);
    expect(settledBotCorrectCharacters({ position: 40, rejectedKeystrokes: 3 }, 'free')).toBe(37);
    expect(settledBotCorrectCharacters({ position: null, rejectedKeystrokes: null }, 'free')).toBe(0);
  });
});
