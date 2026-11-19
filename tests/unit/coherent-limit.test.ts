import { describe, expect, it } from 'vitest';
import { passageCorpus } from '../../src/assets/passage-corpus';
import { raceWordLists } from '../../src/assets/word-lists';
import { longestCoherentWordCount } from '../../src/domain/coherent-limit';
import { wordCount } from '../../src/domain/corpus';
import { textPickProblem } from '../../src/domain/race-text';
import { defaultTextSettings, textLanguages } from '../../src/domain/text-settings';
import { liveRoomMessageKeys } from '../../src/features/rooms/live-room-messages';

describe('the longest coherent text (CONF-04)', () => {
  it.each(textLanguages)('is the word count of the longest %s passage of the corpus', (language) => {
    const longest = Math.max(...passageCorpus.filter((passage) => passage.language === language).map((passage) => wordCount(passage.text)));
    expect(longestCoherentWordCount(language)).toBe(longest);
  });

  it.each(textLanguages)('refuses a coherent %s text one word over the longest passage, and accepts the longest', (language) => {
    const longest = longestCoherentWordCount(language);
    const coherent = { ...defaultTextSettings(language), kind: 'coherent' } as const;
    expect(textPickProblem({ ...coherent, wordCount: longest + 1 }, raceWordLists)).toEqual({ kind: 'coherent-too-long' });
    expect(textPickProblem({ ...coherent, wordCount: longest }, raceWordLists)).toBeNull();
  });

  it('never refuses a random text for being long', () => {
    expect(textPickProblem({ ...defaultTextSettings('fr'), wordCount: 150 }, raceWordLists)).toBeNull();
  });
});

describe('every start refusal the lobby can show reaches the room page', () => {
  it.each(['needMorePlayers', 'textTooFewWords', 'textNeverFound', 'textCoherentTooLong', 'languageNameFr', 'languageNameEn', 'starting', 'startFailed', 'startImpossibleText'])('%s', (key) => {
    expect(liveRoomMessageKeys).toContain(key);
  });
});
