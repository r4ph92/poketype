import { gameConfig } from '@/config/game';
import { passageLength } from './passage';
import type { TextLanguage, TextSettings } from './text-settings';

export type RandomIndex = (count: number) => number;

export type WordLists = Readonly<Record<TextLanguage, readonly string[]>>;

type Draw = { settings: TextSettings; words: readonly string[]; plainInitialWords: readonly string[]; random: RandomIndex };

const tuning = gameConfig.text;

const frenchElisions = ["l'", "d'", "j'", "n'", "s'", "qu'", "c'", "m'", "t'"] as const;

const elidingInitial = /^[aeiouhàâéèêîôû]/u;

const plainWord = /^[a-z]+$/u;

const plainInitial = /^[a-z]/u;

// Real words in a random order, so the sentences make no sense: the text trains typing, not reading.
// It stops at the last whole word that fits the target length; with punctuation, one character stays free for the final period.
export function generateRaceText(settings: TextSettings, wordLists: WordLists, random: RandomIndex): string {
  const draw = drawFrom(settings, wordLists[settings.language], random);
  const limit = settings.punctuation ? settings.length - 1 : settings.length;
  const text = fillTokens(draw, limit).join(' ');
  return (settings.punctuation ? endSentence(text) : text).normalize('NFC');
}

function drawFrom(settings: TextSettings, list: readonly string[], random: RandomIndex): Draw {
  const words = settings.accents ? list : list.filter((word) => plainWord.test(word));
  return { settings, words, plainInitialWords: words.filter((word) => plainInitial.test(word)), random };
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
  const word = pick(draw.random, isCapitalized ? draw.plainInitialWords : draw.words);
  const joined = draw.settings.punctuation && chance(draw.random, tuning.apostropheChance) ? withApostrophe(draw, word) : word;
  return isCapitalized ? joined.charAt(0).toUpperCase() + joined.slice(1) : joined;
}

// Capitals start each sentence; without punctuation there are no sentences, so some words get one at random.
function capitalizes({ settings, random }: Draw, isSentenceStart: boolean): boolean {
  if (!settings.capitals) return false;
  return settings.punctuation ? isSentenceStart : chance(random, tuning.capitalWordChance);
}

// French elides an article or pronoun before a vowel or h (l'arbre); English joins with a possessive (tree's).
function withApostrophe({ settings, random }: Draw, word: string): string {
  if (settings.language === 'en') return `${word}'s`;
  return elidingInitial.test(word) ? pick(random, frenchElisions) + word : word;
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
