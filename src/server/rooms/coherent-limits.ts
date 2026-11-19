import { passageCorpus } from '@/assets/passage-corpus';
import { raceWordLists } from '@/assets/word-lists';
import { servedPassageText, wordCount } from '@/domain/corpus';
import type { CoherentLimits } from '@/domain/coherent-limit';
import { classifyText, type ComplexityLevel } from '@/domain/text-complexity';
import { defaultTextSettings, textLanguages, type TextLanguage } from '@/domain/text-settings';

const firstCoherentWordCount = 10;

// The most generous switches: without punctuation a text holds no punctuation share, and accents kept are the words the frequency list knows.
// A host with other switches may find fewer passages, so the start stays authoritative: the draw refuses what the corpus cannot give.
function longestWordCounts(language: TextLanguage): Record<ComplexityLevel, number> {
  const longest: Record<ComplexityLevel, number> = { easy: 0, medium: 0, hard: 0 };
  const settings = { ...defaultTextSettings(language), kind: 'coherent', punctuation: false } as const;
  for (const passage of passageCorpus.filter((candidate) => candidate.language === language)) {
    for (let count = firstCoherentWordCount; count <= wordCount(passage.text); count += 1) {
      const level = classifyText(servedPassageText(passage.text, { ...settings, wordCount: count }), language, raceWordLists[language]);
      longest[level] = Math.max(longest[level], count);
    }
  }
  return longest;
}

export const coherentLimits = Object.fromEntries(textLanguages.map((language) => [language, longestWordCounts(language)])) as CoherentLimits;
