import { describe, expect, it } from 'vitest';
import { passageCorpus } from '../../src/assets/passage-corpus';
import { raceWordLists } from '../../src/assets/word-lists';
import { gameConfig } from '../../src/config/game';
import { adaptPassage, firstWords, pickPassage, wordCount } from '../../src/domain/corpus';
import { generateRaceText } from '../../src/domain/race-text';
import { defaultTextSettings, textLanguages, type TextSettings } from '../../src/domain/text-settings';
import { liveRoomMessageKeys } from '../../src/features/rooms/live-room-messages';
import { seededRandom } from './support/seeded-random';

const { min, max } = gameConfig.text.wordCount;
const everyWordCount = Array.from({ length: max - min + 1 }, (_, index) => min + index);
const switches = [true, false].flatMap((punctuation) => [true, false].map((digits) => ({ punctuation, digits })));

describe('the word count across the whole range (CONF-04)', () => {
  it('gives random text of exactly N tokens for every N from 10 to 150, both languages, with or without punctuation and digits', () => {
    for (const language of textLanguages) {
      for (const wordCountSetting of everyWordCount) {
        for (const options of switches) {
          const settings: TextSettings = { ...defaultTextSettings(language), wordCount: wordCountSetting, ...options };
          const text = generateRaceText(settings, raceWordLists, seededRandom(wordCountSetting))!;
          expect(text.split(' '), `${language} ${wordCountSetting} ${JSON.stringify(options)}`).toHaveLength(wordCountSetting);
        }
      }
    }
  });

  it('gives coherent text that is a prefix of its passage with exactly N words, for every passage and every N it can hold', () => {
    for (const passage of passageCorpus) {
      for (const punctuation of [true, false]) {
        const settings: TextSettings = { ...defaultTextSettings(passage.language), kind: 'coherent', punctuation };
        const adapted = adaptPassage(passage.text, settings);
        for (let count = min; count <= wordCount(adapted); count += 1) {
          const cut = firstWords(adapted, count);
          expect(wordCount(cut), `${passage.slug} ${count}`).toBe(count);
          expect(adapted.startsWith(cut.replace(/\.$/u, '')), `${passage.slug} ${count}`).toBe(true);
        }
      }
    }
  });

  it('finds no passage long enough above the corpus maximum, so a Cohérent race of that length runs on random words', () => {
    for (const language of textLanguages) {
      const candidates = passageCorpus.filter((passage) => passage.language === language).map((passage) => ({ slug: passage.slug, wordCount: wordCount(passage.text) }));
      const longest = Math.max(...candidates.map((candidate) => candidate.wordCount));
      expect(longest, language).toBeLessThan(max);
      expect(pickPassage(candidates, longest + 1, null, () => 0), language).toBeNull();
    }
  });
});

describe('the start refusal the host sees', () => {
  it('sends the impossible-text message to the room page, so the host never reads a raw key', () => {
    expect(liveRoomMessageKeys).toContain('startImpossibleText');
  });
});
