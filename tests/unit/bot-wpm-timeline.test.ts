import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { botCorrectCharactersBySample, botProgressAt, type BotRacer } from '../../src/domain/bot-race';

const { sampleMs } = gameConfig.wpmTimeline;
const passageLength = 180;
const bot: BotRacer = { level: 'medium', seed: 4_242 };

describe('botCorrectCharactersBySample', () => {
  it('recomputes from the seed the position the bot had at the end of each second, without any stored sample', () => {
    const samples = botCorrectCharactersBySample(bot, passageLength, 20_500);
    expect(samples).toHaveLength(20);
    samples.forEach((position, index) => expect(position).toBe(botProgressAt(bot, passageLength, (index + 1) * sampleMs).position));
  });

  it('gives the same series for the same seed and another for another seed', () => {
    expect(botCorrectCharactersBySample(bot, passageLength, 15_000)).toEqual(botCorrectCharactersBySample({ ...bot }, passageLength, 15_000));
    expect(botCorrectCharactersBySample({ ...bot, seed: 7 }, passageLength, 15_000)).not.toEqual(botCorrectCharactersBySample(bot, passageLength, 15_000));
  });

  it('holds the finished position until the stop, and nothing before the first second', () => {
    const finishMs = botProgressAt(bot, 20, 60_000).finishMs!;
    const samples = botCorrectCharactersBySample(bot, 20, finishMs + 3 * sampleMs);
    expect(samples.at(-1)).toBe(20);
    expect(botCorrectCharactersBySample(bot, passageLength, 900)).toEqual([]);
  });
});
