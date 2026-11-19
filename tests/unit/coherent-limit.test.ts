import { describe, expect, it } from 'vitest';
import { passageCorpus } from '../../src/assets/passage-corpus';
import { raceWordLists } from '../../src/assets/word-lists';
import { wordCount } from '../../src/domain/corpus';
import { textPickProblem } from '../../src/domain/race-text';
import { gameConfig } from '../../src/config/game';
import { complexityLevels } from '../../src/domain/text-complexity';
import { defaultTextSettings, textLanguages } from '../../src/domain/text-settings';
import { coherentLimits } from '../../src/server/rooms/coherent-limits';
import { liveRoomMessageKeys } from '../../src/features/rooms/live-room-messages';

describe('the longest coherent text (CONF-04, CONF-05)', () => {
  it.each(textLanguages)('never exceeds the word count of the longest %s passage, whatever the level', (language) => {
    const longest = Math.max(...passageCorpus.filter((passage) => passage.language === language).map((passage) => wordCount(passage.text)));
    for (const level of complexityLevels) expect(coherentLimits[language][level], level).toBeLessThanOrEqual(longest);
  });

  it.each(textLanguages)('gives every %s level a limit above the shortest text', (language) => {
    for (const level of complexityLevels) expect(coherentLimits[language][level], level).toBeGreaterThanOrEqual(gameConfig.text.wordCount.min);
  });

  it.each(textLanguages)('refuses a coherent %s text one word over the limit of its level, and accepts the limit', (language) => {
    for (const complexity of complexityLevels) {
      const longest = coherentLimits[language][complexity];
      const coherent = { ...defaultTextSettings(language), kind: 'coherent', complexity } as const;
      expect(textPickProblem({ ...coherent, wordCount: longest + 1 }, raceWordLists, coherentLimits), complexity).toEqual({ kind: 'coherent-too-long' });
      expect(textPickProblem({ ...coherent, wordCount: longest }, raceWordLists, coherentLimits), complexity).toBeNull();
    }
  });

  it('has no Facile coherent text of 100 words, the length that used to fall back to random words', () => {
    for (const language of textLanguages) expect(coherentLimits[language].easy).toBeLessThan(100);
  });

  it('never refuses a random text for being long', () => {
    expect(textPickProblem({ ...defaultTextSettings('fr'), wordCount: 150 }, raceWordLists, coherentLimits)).toBeNull();
  });
});

describe('every start refusal the lobby can show reaches the room page', () => {
  it.each(['needMorePlayers', 'textTooFewWords', 'textNeverFound', 'textCoherentTooLong', 'textPicksTooRare', 'levelNameEasy', 'levelNameMedium', 'levelNameHard', 'languageNameFr', 'languageNameEn', 'starting', 'startFailed', 'startImpossibleText'])('%s', (key) => {
    expect(liveRoomMessageKeys).toContain(key);
  });
});
