import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { botProgressAt } from '../../src/domain/bot-race';
import { awardDueBonuses, type BonusDraw, type BonusRacer, type CheckpointRace } from '../../src/domain/catch-up-bonus';
import { memberText, parseRaceBonuses } from '../../src/domain/catch-up-bonus-view';
import { passageLength } from '../../src/domain/passage';
import { measureRacer } from '../../src/domain/race-results';
import { racerText, racerTextLength, removableWordCount, type TextEdit } from '../../src/domain/racer-text';

// Twenty words of four letters: 99 characters, so 25 % is position 25 (24.75 rounded up).
const passage = Array.from({ length: 20 }, () => 'chat').join(' ');

const removeOnly: BonusDraw = { kind: () => 'remove-words', words: () => null };

function removed(wordsRemoved: number): TextEdit[] {
  return [{ kind: 'remove-words', wordsRemoved }];
}

function racer(racerKey: string, position: number, extra: Partial<BonusRacer> = {}): BonusRacer {
  return { racerKey, position, isFinished: false, isOut: false, edits: [], bonusesReceived: 0, ...extra };
}

function race(racers: BonusRacer[], extra: Partial<CheckpointRace> = {}): CheckpointRace {
  return { isEnabled: true, passage, checkpointsPassed: 0, racers, ...extra };
}

function receivers(outcome: ReturnType<typeof awardDueBonuses>): string[] {
  return outcome.awards.map((award) => award.racerKey);
}

describe('the racer text of the "-3 mots" bonus', () => {
  it('removes the last three words and the spaces before them', () => {
    expect(racerText('le chat dort sur le lit', 3)).toBe('le chat dort');
    expect(racerTextLength('le chat dort sur le lit', 3)).toBe(passageLength('le chat dort'));
  });

  it('keeps the text whole without a bonus and counts accented characters once', () => {
    expect(racerText('un garçon très gentil', 0)).toBe('un garçon très gentil');
    expect(racerTextLength('un garçon très gentil été', 1)).toBe(21);
  });

  it('never removes a word under the cursor or already typed, and leaves one unreached word', () => {
    const text = 'le chat dort sur le lit';
    expect(removableWordCount(text, 0, 3)).toBe(3);
    expect(removableWordCount(text, 12, 3)).toBe(2);
    expect(removableWordCount(text, 13, 3)).toBe(1);
    expect(removableWordCount(text, 17, 3)).toBe(0);
  });
});

describe('catch-up bonuses at the leader checkpoints (BONUS-01)', () => {
  it('never fires while bonuses are off, wherever the leader is', () => {
    const outcome = awardDueBonuses(race([racer('maya', 99, { isFinished: true }), racer('zoe', 0)], { isEnabled: false }), removeOnly);

    expect(outcome).toEqual({ checkpointsPassed: 0, awards: [] });
  });

  it('waits until the leader reaches 25 % of their text', () => {
    const outcome = awardDueBonuses(race([racer('maya', 24), racer('zoe', 0)]), removeOnly);

    expect(outcome).toEqual({ checkpointsPassed: 0, awards: [] });
  });

  it('gives the last racer one "-3 mots" bonus when the leader passes 25 %, and nothing to the leader', () => {
    const outcome = awardDueBonuses(race([racer('maya', 25), racer('leo', 10), racer('zoe', 5)]), removeOnly);

    expect(outcome.checkpointsPassed).toBe(1);
    expect(outcome.awards).toEqual([{ racerKey: 'zoe', checkpoint: 25, kind: 'remove-words', wordsRemoved: gameConfig.catchUpBonuses.removedWords }]);
  });

  it('also helps a racer more than 25 points behind the leader who is not last', () => {
    const outcome = awardDueBonuses(race([racer('maya', 60), racer('leo', 20), racer('zoe', 5)], { checkpointsPassed: 1 }), removeOnly);

    expect(receivers(outcome)).toEqual(['leo', 'zoe']);
  });

  it('does not help a racer exactly 25 points behind who is not last', () => {
    const fourWords = 'chat chat chat chat';
    const outcome = awardDueBonuses({ isEnabled: true, passage: fourWords, checkpointsPassed: 1, racers: [racer('maya', 19, { isFinished: true }), racer('leo', 15), racer('zoe', 0)] }, removeOnly);

    expect(receivers(outcome)).toEqual(['zoe']);
  });

  it('gives every racer tied for last a bonus, but nobody when everyone is level', () => {
    expect(receivers(awardDueBonuses(race([racer('maya', 30), racer('leo', 20), racer('zoe', 20)]), removeOnly))).toEqual(['leo', 'zoe']);
    expect(awardDueBonuses(race([racer('maya', 30), racer('zoe', 30)]), removeOnly).awards).toEqual([]);
  });

  it('settles each checkpoint once: a later report at the same checkpoint gives nothing more', () => {
    const outcome = awardDueBonuses(race([racer('maya', 40), racer('zoe', 0, { edits: removed(3), bonusesReceived: 1 })], { checkpointsPassed: 1 }), removeOnly);

    expect(outcome).toEqual({ checkpointsPassed: 1, awards: [] });
  });

  it('settles two checkpoints in one jump, the second on the text the first one shortened', () => {
    const outcome = awardDueBonuses(race([racer('maya', 50), racer('zoe', 0)]), removeOnly);

    expect(outcome.checkpointsPassed).toBe(2);
    expect(outcome.awards.map((award) => award.checkpoint)).toEqual([25, 50]);
  });

  it('gives a racer at most three bonuses in a race', () => {
    const capped = awardDueBonuses(race([racer('maya', 99, { isFinished: true }), racer('zoe', 0, { bonusesReceived: 3, edits: removed(9) })]), removeOnly);
    const fromScratch = awardDueBonuses(race([racer('maya', 99, { isFinished: true }), racer('zoe', 0)]), removeOnly);

    expect(capped.awards).toEqual([]);
    expect(capped.checkpointsPassed).toBe(3);
    expect(fromScratch.awards).toHaveLength(gameConfig.catchUpBonuses.maxPerRacer);
  });

  it('helps a trailing bot under the same rule', () => {
    const outcome = awardDueBonuses(race([racer('maya', 25), racer('bot-brock', 3)]), removeOnly);

    expect(receivers(outcome)).toEqual(['bot-brock']);
  });

  it('never helps a finisher, an abandoner or a racer removed as inactive, and an abandoner never leads', () => {
    const outcome = awardDueBonuses(race([racer('gone', 90, { isOut: true }), racer('maya', 20), racer('done', 99, { isFinished: true }), racer('zoe', 0, { isOut: true }), racer('leo', 2)], { checkpointsPassed: 2 }), removeOnly);

    expect(receivers(outcome)).toEqual(['leo', 'maya']);
  });

  it('measures progress on the racer\'s own shortened text', () => {
    // Zoe's text lost 6 words (30 characters): 40 of 69 is 58 %, within 25 points of a leader at 75 %, and Leo is last.
    const outcome = awardDueBonuses(race([racer('maya', 75), racer('zoe', 40, { edits: removed(6), bonusesReceived: 2 }), racer('leo', 35)], { checkpointsPassed: 2 }), removeOnly);

    expect(racerTextLength(passage, 6)).toBe(69);
    expect(receivers(outcome)).toEqual(['leo']);
  });

  it('counts a racer who reached the end of a shortened text as a 100 % leader', () => {
    const outcome = awardDueBonuses(race([racer('zoe', 69, { isFinished: true, edits: removed(6) }), racer('maya', 60)], { checkpointsPassed: 2 }), removeOnly);

    expect(outcome.checkpointsPassed).toBe(3);
    expect(receivers(outcome)).toEqual(['maya']);
  });

  it('removes fewer words, or gives none, when the racer already reached the end of the text', () => {
    const nearEnd = awardDueBonuses(race([racer('maya', 99, { isFinished: true }), racer('zoe', 84)], { checkpointsPassed: 2 }), removeOnly);
    const onLastWord = awardDueBonuses(race([racer('maya', 99, { isFinished: true }), racer('zoe', 95)], { checkpointsPassed: 2 }), removeOnly);

    expect(nearEnd.awards).toEqual([{ racerKey: 'zoe', checkpoint: 75, kind: 'remove-words', wordsRemoved: 2 }]);
    expect(onLastWord.awards).toEqual([]);
    expect(onLastWord.checkpointsPassed).toBe(3);
  });
});

describe('what a bonus changes for the racer', () => {
  it('lets a bot finish its shortened text earlier on exactly the same keystrokes', () => {
    const bot = { level: 'intermediate' as const, seed: 42 };
    const shortLength = racerTextLength(passage, 3);
    const fullCourse = { text: passage, errorMode: 'blocked' as const };
    const shortCourse = { text: racerText(passage, 3), errorMode: 'blocked' as const };
    const full = botProgressAt(bot, fullCourse, 60_000);
    const short = botProgressAt(bot, shortCourse, 60_000);
    const midway = 5_000;

    expect(botProgressAt(bot, shortCourse, midway)).toEqual(botProgressAt(bot, fullCourse, midway));
    expect(short.position).toBe(shortLength);
    expect(short.finishMs!).toBeLessThan(full.finishMs!);
  });

  it('counts only the characters really typed in the WPM, never the removed words', () => {
    const typedCharacters = racerTextLength(passage, 3);
    const { grossWpm } = measureRacer({ typedCharacters, keystrokes: typedCharacters, rejectedKeystrokes: 0, elapsedMs: 60_000 });

    expect(grossWpm).toBeCloseTo(typedCharacters / gameConfig.scoring.charactersPerWord);
    expect(grossWpm).toBeLessThan(passageLength(passage) / gameConfig.scoring.charactersPerWord);
  });
});

describe('the bonuses a race view reads', () => {
  const bonus = { memberKey: 'bot-brock', checkpoint: 25, kind: 'remove-words', wordsRemoved: 3, awardedMs: 12_000 };

  it('accepts the bonuses of a race that gives them and shortens each racer\'s own text', () => {
    const parsed = parseRaceBonuses({ catchUpBonuses: true, bonuses: [bonus, { ...bonus, checkpoint: 50, wordsRemoved: 2 }] });

    expect(parsed?.bonuses).toHaveLength(2);
    expect(memberText('le chat dort sur le lit et rêve', parsed!.bonuses, 'bot-brock')).toBe('le chat dort');
    expect(memberText('le chat dort sur le lit et rêve', parsed!.bonuses, 'zoe')).toBe('le chat dort sur le lit et rêve');
  });

  it.each([
    ['a bonus in a race without bonuses', { catchUpBonuses: false, bonuses: [bonus] }],
    ['an unknown checkpoint', { catchUpBonuses: true, bonuses: [{ ...bonus, checkpoint: 30 }] }],
    ['an unknown kind', { catchUpBonuses: true, bonuses: [{ ...bonus, kind: 'fog' }] }],
    ['a bonus removing no word', { catchUpBonuses: true, bonuses: [{ ...bonus, wordsRemoved: 0 }] }],
    ['a missing switch', { bonuses: [] }],
  ])('refuses %s', (_label, value) => {
    expect(parseRaceBonuses(value)).toBeNull();
  });
});
