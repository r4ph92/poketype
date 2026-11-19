import { describe, expect, it } from 'vitest';
import { passageCorpus } from '../../src/assets/passage-corpus';
import { raceWordLists } from '../../src/assets/word-lists';
import { gameConfig } from '../../src/config/game';
import { generateRaceText, textPickProblem } from '../../src/domain/race-text';
import { classifyText, complexityLevels, isComplexityLevel, levelOfMeasures, measureText, type ComplexityLevel } from '../../src/domain/text-complexity';
import { defaultTextSettings, textLanguages, type TextLanguage, type TextSettings } from '../../src/domain/text-settings';
import { seededRandom } from './support/seeded-random';

const { ceilings } = gameConfig.text.complexity;

const everyOption = { punctuation: true, accents: true, capitals: true, digits: true };

const noOption = { punctuation: false, accents: false, capitals: false, digits: false };

const seeds = Array.from({ length: 40 }, (_, index) => index + 1);

function textsAt(language: TextLanguage, complexity: ComplexityLevel, wordCount: number, options: Partial<TextSettings>): string[] {
  const settings: TextSettings = { ...defaultTextSettings(language), complexity, wordCount, ...options };
  return seeds.map((seed) => generateRaceText(settings, raceWordLists, seededRandom(seed))!);
}

describe('measureText', () => {
  const list = ['the', 'cat', 'sat', 'on', 'mat'];

  it('averages the letters per word and the position of each word in the frequency list', () => {
    const measures = measureText('The cat sat.', list);
    expect(measures.averageWordLength).toBeCloseTo(3);
    expect(measures.averageRank).toBeCloseTo(1);
  });

  it('counts a word missing from the list as the list length', () => {
    expect(measureText('zebra', list).averageRank).toBe(list.length);
  });

  it("counts an apostrophe word as one word ranked by its longest run of letters, so tree's is the word tree", () => {
    const measures = measureText("cat's", list);
    expect(measures.averageWordLength).toBe(4);
    expect(measures.averageRank).toBe(1);
  });

  it('shares the characters that are not letters among all the characters that are not spaces', () => {
    expect(measureText('ab, cd.', list).punctuationShare).toBeCloseTo(2 / 6);
    expect(measureText('abc def', list).punctuationShare).toBe(0);
    expect(measureText('', list).punctuationShare).toBe(0);
  });
});

describe('levelOfMeasures', () => {
  const easyMeasures = { averageWordLength: 4, averageRank: 200, punctuationShare: 0.03 };

  it('is easy when every criterion is under its easy ceiling', () => {
    expect(levelOfMeasures(easyMeasures, 'en')).toBe('easy');
  });

  it('is as hard as the hardest criterion, whichever it is', () => {
    expect(levelOfMeasures({ ...easyMeasures, averageWordLength: ceilings.averageWordLength.en.easy + 0.1 }, 'en')).toBe('medium');
    expect(levelOfMeasures({ ...easyMeasures, averageRank: ceilings.averageRank.medium + 1 }, 'en')).toBe('hard');
    expect(levelOfMeasures({ ...easyMeasures, punctuationShare: ceilings.punctuationShare.easy + 0.01 }, 'en')).toBe('medium');
  });

  it('holds a value equal to a ceiling at that ceiling level', () => {
    expect(levelOfMeasures({ ...easyMeasures, averageRank: ceilings.averageRank.easy }, 'fr')).toBe('easy');
    expect(levelOfMeasures({ ...easyMeasures, averageRank: ceilings.averageRank.medium }, 'fr')).toBe('medium');
  });

  it('judges the word length of French and English differently', () => {
    const length = ceilings.averageWordLength.fr.easy;
    expect(levelOfMeasures({ ...easyMeasures, averageWordLength: length }, 'fr')).toBe('easy');
    expect(levelOfMeasures({ ...easyMeasures, averageWordLength: length }, 'en')).not.toBe('easy');
  });
});

describe('a random text at each level (CONF-05)', () => {
  for (const language of textLanguages) {
    for (const complexity of complexityLevels) {
      for (const [label, options] of [['every option on', everyOption], ['every option off', noOption]] as const) {
        it(`${language} ${complexity}, ${label}: meets the thresholds of its level at 10, 40 and 150 words`, () => {
          for (const wordCount of [10, 40, 150]) {
            for (const text of textsAt(language, complexity, wordCount, options)) {
              const measures = measureText(text, raceWordLists[language]);
              expect(levelOfMeasures(measures, language), text).toBe(complexity);
              if (complexity === 'hard') continue;
              expect(measures.averageWordLength, text).toBeLessThanOrEqual(ceilings.averageWordLength[language][complexity]);
              expect(measures.averageRank, text).toBeLessThanOrEqual(ceilings.averageRank[complexity]);
              expect(measures.punctuationShare, text).toBeLessThanOrEqual(ceilings.punctuationShare[complexity]);
            }
          }
        });
      }
    }
  }

  it('is hard through at least one criterion above the medium ceiling, and medium through one above the easy ceiling', () => {
    for (const language of textLanguages) {
      for (const text of textsAt(language, 'hard', 40, everyOption)) {
        const measures = measureText(text, raceWordLists[language]);
        const exceeds = measures.averageWordLength > ceilings.averageWordLength[language].medium || measures.averageRank > ceilings.averageRank.medium || measures.punctuationShare > ceilings.punctuationShare.medium;
        expect(exceeds, text).toBe(true);
      }
      for (const text of textsAt(language, 'medium', 40, everyOption)) {
        const measures = measureText(text, raceWordLists[language]);
        const exceeds = measures.averageWordLength > ceilings.averageWordLength[language].easy || measures.averageRank > ceilings.averageRank.easy || measures.punctuationShare > ceilings.punctuationShare.easy;
        expect(exceeds, text).toBe(true);
      }
    }
  });

  it('keeps the host picks: the excluded characters never appear and each included one comes up three times', () => {
    for (const complexity of complexityLevels) {
      const settings: TextSettings = { ...defaultTextSettings('en'), complexity, wordCount: 60, include: ['t'], exclude: ['e'] };
      for (const seed of seeds) {
        const text = generateRaceText(settings, raceWordLists, seededRandom(seed))!.toLowerCase();
        expect(text).not.toContain('e');
        expect(text.split('t').length - 1).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('reports a pick the level has no word for, so the start is refused beforehand', () => {
    const easy: TextSettings = { ...defaultTextSettings('fr'), complexity: 'easy', include: ['â'] };
    expect(textPickProblem(easy, raceWordLists)).toEqual({ kind: 'never-found', characters: ['â'] });
    expect(textPickProblem({ ...easy, complexity: 'medium' }, raceWordLists)).toBeNull();
  });
});

describe('the passage corpus by level', () => {
  function levelsOf(language: TextLanguage): ComplexityLevel[] {
    return passageCorpus.filter((passage) => passage.language === language).map((passage) => classifyText(passage.text, language, raceWordLists[language]));
  }

  for (const language of textLanguages) {
    it(`${language}: holds passages at every level`, () => {
      const levels = levelsOf(language);
      for (const level of complexityLevels) expect(levels.filter((found) => found === level).length, level).toBeGreaterThanOrEqual(2);
    });
  }

  it('classifies a passage the same way every time', () => {
    const passage = passageCorpus[0]!;
    expect(classifyText(passage.text, passage.language, raceWordLists[passage.language])).toBe(classifyText(passage.text, passage.language, raceWordLists[passage.language]));
  });
});

describe('isComplexityLevel', () => {
  it('knows the three levels and nothing else', () => {
    for (const level of complexityLevels) expect(isComplexityLevel(level)).toBe(true);
    for (const value of ['Easy', 'expert', '', null, 0, undefined]) expect(isComplexityLevel(value)).toBe(false);
  });
});
