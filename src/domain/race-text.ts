import { gameConfig } from '@/config/game';
import { containsAny, requiredOccurrences, type PickProblem } from './character-picks';
import { passageLength } from './passage';
import type { TextLanguage, TextSettings } from './text-settings';

export type RandomIndex = (count: number) => number;

export type WordLists = Readonly<Record<TextLanguage, readonly string[]>>;

// missing counts, per required character, how many more times it must appear; the draw favours words that hold one of them.
type Draw = { settings: TextSettings; words: readonly string[]; plainInitialWords: readonly string[]; elisions: readonly string[]; random: RandomIndex; missing: Map<string, number> };

const tuning = gameConfig.text;

const frenchElisions = ["l'", "d'", "j'", "n'", "s'", "qu'", "c'", "m'", "t'"] as const;

const elidingInitial = /^[aeiouhàâéèêîôû]/u;

const plainWord = /^[a-z]+$/u;

const plainInitial = /^[a-z]/u;

// Real words in a random order, so the sentences make no sense: the text trains typing, not reading.
// It stops at the last whole word that fits the target length; with punctuation, one character stays free for the final period.
// Excluded characters never appear; each included one appears at least three times when the length allows, the text being drawn again if needed
// (CONF-07). textPickProblem tells beforehand when the picks cannot give a text.
export function generateRaceText(settings: TextSettings, wordLists: WordLists, random: RandomIndex): string {
  let text = drawText(settings, wordLists, random);
  for (let attempt = 1; attempt < tuning.includedTextAttempts && !hasEveryIncluded(text, settings.include); attempt += 1) text = drawText(settings, wordLists, random);
  return text;
}

// null when the picks can give a text; checked before a race starts, in the lobby and on the server.
export function textPickProblem(settings: TextSettings, wordLists: WordLists): PickProblem | null {
  const words = usableWords(settings, wordLists[settings.language]);
  if (words.length < tuning.minimumWords) return { kind: 'too-few-words' };
  const neverFound = settings.include.filter((character) => !words.some((word) => word.includes(character)));
  return neverFound.length > 0 ? { kind: 'never-found', characters: neverFound } : null;
}

function drawText(settings: TextSettings, wordLists: WordLists, random: RandomIndex): string {
  const draw = drawFrom(settings, wordLists[settings.language], random);
  const limit = settings.punctuation ? settings.length - 1 : settings.length;
  const text = fillTokens(draw, limit).join(' ');
  return (settings.punctuation ? endSentence(text) : text).normalize('NFC');
}

function hasEveryIncluded(text: string, include: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return include.every((character) => occurrences(lower, character) >= requiredOccurrences);
}

function occurrences(text: string, character: string): number {
  return text.split(character).length - 1;
}

// Without accents, only plain words; an excluded character removes every word holding it.
function usableWords({ accents, exclude }: TextSettings, list: readonly string[]): string[] {
  return list.filter((word) => (accents || plainWord.test(word)) && !containsAny(word, exclude));
}

function drawFrom(settings: TextSettings, list: readonly string[], random: RandomIndex): Draw {
  const words = usableWords(settings, list);
  const elisions = frenchElisions.filter((elision) => !containsAny(elision, settings.exclude));
  const missing = new Map(settings.include.map((character) => [character, requiredOccurrences]));
  return { settings, words, plainInitialWords: words.filter((word) => plainInitial.test(word)), elisions, random, missing };
}

function fillTokens(draw: Draw, limit: number): string[] {
  const tokens: string[] = [];
  let length = 0;
  for (;;) {
    for (const token of sentenceTokens(draw)) {
      const added = (tokens.length === 0 ? 0 : 1) + passageLength(token);
      if (length + added > limit) return tokens;
      tokens.push(token);
      length += added;
    }
  }
}

function sentenceTokens(draw: Draw): string[] {
  const count = between(draw.random, tuning.sentenceWords.min, tuning.sentenceWords.max);
  const endMark = chance(draw.random, tuning.questionChance) ? '?' : '.';
  return Array.from({ length: count }, (_, index) => {
    const token = coreToken(draw, index === 0);
    if (!draw.settings.punctuation) return token;
    if (index === count - 1) return token + endMark;
    return chance(draw.random, tuning.commaChance) ? `${token},` : token;
  });
}

function coreToken(draw: Draw, isSentenceStart: boolean): string {
  if (draw.settings.digits && chance(draw.random, tuning.digitChance)) return String(between(draw.random, 1, tuning.maxNumber));
  return wordToken(draw, isSentenceStart);
}

// A capital never lands on an accented letter: accented capitals are too hard to find for ages 10–12.
function wordToken(draw: Draw, isSentenceStart: boolean): string {
  const isCapitalized = capitalizes(draw, isSentenceStart);
  const pool = isCapitalized ? draw.plainInitialWords : draw.words;
  const word = pick(draw.random, favouredWords(draw, pool) ?? pool);
  countIncluded(draw, word);
  const joined = draw.settings.punctuation && chance(draw.random, tuning.apostropheChance) ? withApostrophe(draw, word) : word;
  return isCapitalized ? joined.charAt(0).toUpperCase() + joined.slice(1) : joined;
}

// While a required character is still missing, half the words are drawn among those that hold one.
function favouredWords(draw: Draw, pool: readonly string[]): readonly string[] | null {
  const stillMissing = [...draw.missing].filter(([, count]) => count > 0).map(([character]) => character);
  if (stillMissing.length === 0 || !chance(draw.random, tuning.includedWordChance)) return null;
  const holding = pool.filter((word) => containsAny(word, stillMissing));
  return holding.length > 0 ? holding : null;
}

function countIncluded(draw: Draw, word: string): void {
  for (const [character, count] of draw.missing) draw.missing.set(character, count - occurrences(word, character));
}

// Capitals start each sentence; without punctuation there are no sentences, so some words get one at random.
function capitalizes({ settings, random }: Draw, isSentenceStart: boolean): boolean {
  if (!settings.capitals) return false;
  return settings.punctuation ? isSentenceStart : chance(random, tuning.capitalWordChance);
}

// French elides an article or pronoun before a vowel or h (l'arbre); English joins with a possessive (tree's).
function withApostrophe({ settings, random, elisions }: Draw, word: string): string {
  if (settings.language === 'en') return settings.exclude.includes('s') ? word : `${word}'s`;
  return elidingInitial.test(word) && elisions.length > 0 ? pick(random, elisions) + word : word;
}

function endSentence(text: string): string {
  const trimmed = text.endsWith(',') ? text.slice(0, -1) : text;
  return trimmed.endsWith('.') || trimmed.endsWith('?') ? trimmed : `${trimmed}.`;
}

function pick<Item>(random: RandomIndex, items: readonly Item[]): Item {
  const item = items[random(items.length)];
  if (item === undefined) throw new RangeError('The random index fell outside the list.');
  return item;
}

function between(random: RandomIndex, min: number, max: number): number {
  return min + random(max - min + 1);
}

function chance(random: RandomIndex, probability: number): boolean {
  return random(1000) < probability * 1000;
}
