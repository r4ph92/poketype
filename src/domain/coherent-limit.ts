import { passageCorpus } from '@/assets/passage-corpus';
import { wordCount } from './corpus';
import { textLanguages, type TextLanguage } from './text-settings';

const longestByLanguage = Object.fromEntries(
  textLanguages.map((language) => [language, Math.max(0, ...passageCorpus.filter((passage) => passage.language === language).map((passage) => wordCount(passage.text)))]),
) as Record<TextLanguage, number>;

// The most words a coherent text can have in this language: the length of its longest corpus passage (CONF-04).
export function longestCoherentWordCount(language: TextLanguage): number {
  return longestByLanguage[language];
}
