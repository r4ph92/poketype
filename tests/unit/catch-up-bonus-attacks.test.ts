import { describe, expect, it } from 'vitest';
import { awardDueBonuses, type BonusRacer } from '../../src/domain/catch-up-bonus';
import { passageLength } from '../../src/domain/passage';
import { racerText } from '../../src/domain/racer-text';

// The 10-word text a QA race drew; 55 characters.
const shortPassage = 'dit leur avais soir suite femme point droit compte fais';

function racer(racerKey: string, position: number, extra: Partial<BonusRacer> = {}): BonusRacer {
  return { racerKey, position, isFinished: false, isOut: false, wordsRemoved: 0, bonusesReceived: 0, ...extra };
}

describe('catch-up bonuses under QA attacks (#77)', () => {
  it('settles all three checkpoints in order when the leader jumps past 75 % in one report, and always leaves the trailing racer a word to type', () => {
    const outcome = awardDueBonuses({ isEnabled: true, passage: shortPassage, checkpointsPassed: 0, racers: [racer('maya', 44), racer('zoe', 0)] });
    expect(outcome.checkpointsPassed).toBe(3);
    expect(outcome.awards.map(({ racerKey, checkpoint, wordsRemoved }) => [racerKey, checkpoint, wordsRemoved])).toEqual([['zoe', 25, 3], ['zoe', 50, 3], ['zoe', 75, 2]]);
    expect(racerText(shortPassage, 8)).toBe('dit leur');
  });

  it('settles every remaining checkpoint for the others when the leader finishes', () => {
    const length = passageLength(shortPassage);
    const outcome = awardDueBonuses({ isEnabled: true, passage: shortPassage, checkpointsPassed: 1, racers: [racer('zoe', length, { isFinished: true, wordsRemoved: 3, bonusesReceived: 1 }), racer('maya', 16)] });
    expect(outcome.checkpointsPassed).toBe(3);
    expect(outcome.awards.map(({ racerKey, checkpoint }) => [racerKey, checkpoint])).toEqual([['maya', 50], ['maya', 75]]);
  });

  it('measures the leader on their own text, so a racer a bonus shortened can lead and the former leader then trails', () => {
    const zoeText = racerText(shortPassage, 3);
    const outcome = awardDueBonuses({ isEnabled: true, passage: shortPassage, checkpointsPassed: 1, racers: [racer('maya', 28), racer('zoe', passageLength(zoeText) - 5, { wordsRemoved: 3, bonusesReceived: 1 })] });
    expect(outcome.checkpointsPassed).toBe(3);
    // At 75 % Maya's one unreached word must stay, so the second checkpoint passes without a bonus.
    expect(outcome.awards.map(({ racerKey, checkpoint, wordsRemoved }) => [racerKey, checkpoint, wordsRemoved])).toEqual([['maya', 50, 3]]);
  });

  it('never fires at one character under 25 %, and fires at exactly 25 %', () => {
    const quarter = Math.ceil(passageLength(shortPassage) / 4);
    const racers = (leader: number) => [racer('maya', leader), racer('zoe', 0)];
    expect(awardDueBonuses({ isEnabled: true, passage: shortPassage, checkpointsPassed: 0, racers: racers(quarter - 1) }).awards).toEqual([]);
    expect(awardDueBonuses({ isEnabled: true, passage: shortPassage, checkpointsPassed: 0, racers: racers(quarter) }).awards).toHaveLength(1);
  });
});
