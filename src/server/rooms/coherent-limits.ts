import { passageCorpus } from '@/assets/passage-corpus';
import { wordCount } from '@/domain/corpus';
import type { CoherentLimits } from '@/domain/coherent-limit';
import { textLanguages, type TextLanguage } from '@/domain/text-settings';

function longestPassageWords(language: TextLanguage): number {
  return Math.max(0, ...passageCorpus.filter((passage) => passage.language === language).map((passage) => wordCount(passage.text)));
}

export const coherentLimits = Object.fromEntries(textLanguages.map((language) => [language, longestPassageWords(language)])) as CoherentLimits;
