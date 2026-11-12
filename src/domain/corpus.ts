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

export function wordCount(text: string): number {
  return text.split(/\s+/u).filter((word) => /\p{L}/u.test(word)).length;
}

// A simple readability measure stored with each passage for later tiers (#152): ten points per letter of average word length above three,
// plus the average number of words per sentence. A short fable of short words scores near 20; long sentences of long words near 40.
export function measureComplexity(text: string): number {
  const words = text.split(/\s+/u).map((word) => word.replace(/[^\p{L}]/gu, '')).filter((word) => word.length > 0);
  const sentences = Math.max(1, text.split(/[.!?]+/u).filter((sentence) => /\p{L}/u.test(sentence)).length);
  const averageWordLength = words.reduce((total, word) => total + Array.from(word).length, 0) / Math.max(1, words.length);
  return Math.round(Math.max(0, averageWordLength - 3) * 10 + words.length / sentences);
}

// Among the passages of the race language other than the room's previous one, a random pick among the few closest to the host's length,
// so the length setting still matters and the same room does not see the same passage twice in a row. null when the corpus has none.
export function pickPassage<Passage extends { slug: string; length: number }>(candidates: readonly Passage[], targetLength: number, previousSlug: string | null, random: RandomIndex): Passage | null {
  const others = candidates.filter((candidate) => candidate.slug !== previousSlug);
  const pool = others.length > 0 ? others : candidates;
  if (pool.length === 0) return null;
  const closest = [...pool].sort((first, second) => Math.abs(first.length - targetLength) - Math.abs(second.length - targetLength) || (first.slug < second.slug ? -1 : 1)).slice(0, closestPassageCount);
  return closest[random(closest.length)]!;
}

const closestPassageCount = 3;
