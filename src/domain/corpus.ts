import type { TextLanguage, TextSettings } from './text-settings';

// One public-domain passage of the coherent text type (CONF-03): slug is its stable key across seeds; source names the edition it was taken from.
export type CorpusPassage = { slug: string; language: TextLanguage; title: string; author: string; source: string; text: string };

// What a coherent race keeps of its passage, for the results ("title — author").
export type PassageCredit = { title: string; author: string };

export type RandomIndex = (size: number) => number;

const sentencePunctuation = /[.,;:!?]/gu;

const combiningMarks = /\p{M}/gu;

// The host's switches applied to a real passage (CONF-06): without punctuation the sentence marks go, but apostrophes and hyphens stay,
// since they belong to words (l'eau, dit-elle); without capitals it is lowercased; without accents every letter loses its accent (ç becomes c).
// Digits only apply to random text. The result is NFC, like every passage.
export function adaptPassage(text: string, { language, punctuation, capitals, accents }: TextSettings): string {
  let adapted = text.normalize('NFC');
  if (!punctuation) adapted = adapted.replace(sentencePunctuation, ' ');
  if (!capitals) adapted = adapted.toLocaleLowerCase(language);
  if (!accents) adapted = adapted.normalize('NFD').replace(combiningMarks, '');
  return adapted.replace(/\s+/gu, ' ').trim().normalize('NFC');
}

function isWord(token: string): boolean {
  return /\p{L}/u.test(token);
}

export function wordCount(text: string): number {
  return text.split(/\s+/u).filter(isWord).length;
}

// The text up to its wordCount-th word (CONF-04), counted like wordCount; a clause mark left at the cut becomes a period. A shorter text stays whole.
export function firstWords(text: string, count: number): string {
  const tokens = text.split(/\s+/u);
  let seen = 0;
  for (const [index, token] of tokens.entries()) {
    if (isWord(token)) seen += 1;
    if (seen === count) return tokens.slice(0, index + 1).join(' ').replace(/[,;:]$/u, '.');
  }
  return text;
}

// A simple readability measure stored with each passage for later tiers (#152): ten points per letter of average word length above three,
// plus the average number of words per sentence. A short fable of short words scores near 20; long sentences of long words near 40.
export function measureComplexity(text: string): number {
  const words = text.split(/\s+/u).map((word) => word.replace(/[^\p{L}]/gu, '')).filter((word) => word.length > 0);
  const sentences = Math.max(1, text.split(/[.!?]+/u).filter((sentence) => /\p{L}/u.test(sentence)).length);
  const averageWordLength = words.reduce((total, word) => total + Array.from(word).length, 0) / Math.max(1, words.length);
  return Math.round(Math.max(0, averageWordLength - 3) * 10 + words.length / sentences);
}

// Among the passages of the race language that hold at least the host's number of words, other than the room's previous one when another exists, a random pick.
// null when no passage is long enough (the corpus is finite, so the longest settings may have none).
export function pickPassage<Passage extends { slug: string; wordCount: number }>(candidates: readonly Passage[], requiredWords: number, previousSlug: string | null, random: RandomIndex): Passage | null {
  const longEnough = candidates.filter((candidate) => candidate.wordCount >= requiredWords);
  const others = longEnough.filter((candidate) => candidate.slug !== previousSlug);
  const pool = others.length > 0 ? others : longEnough;
  return pool.length === 0 ? null : pool[random(pool.length)]!;
}
