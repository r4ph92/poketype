import { gameConfig } from '@/config/game';
import type { TextLanguage } from './text-settings';

// How hard a race text is to type (CONF-05): docs/text-complexity.md explains the three criteria and their thresholds.
export const complexityLevels = ['easy', 'medium', 'hard'] as const;

export type ComplexityLevel = (typeof complexityLevels)[number];

export const defaultComplexityLevel: ComplexityLevel = 'easy';

export function isComplexityLevel(value: unknown): value is ComplexityLevel {
  return complexityLevels.some((level) => level === value);
}

// averageWordLength: letters per word. averageRank: position of a word in its frequency list (0 is the most frequent), a word outside the list counting as the list's length.
// punctuationShare: punctuation and special characters (neither letters, digits nor spaces), among all the characters that are not spaces or digits: numbers are the digits switch's, not a level's.
export type TextMeasures = { averageWordLength: number; averageRank: number; punctuationShare: number };

const letters = /\p{L}/u;

const nonLetters = /[^\p{L}]+/u;

const rankIndexes = new WeakMap<readonly string[], Map<string, number>>();

function rankIndexOf(wordList: readonly string[]): Map<string, number> {
  const known = rankIndexes.get(wordList);
  if (known) return known;
  const index = new Map(wordList.map((word, position) => [word, position]));
  rankIndexes.set(wordList, index);
  return index;
}

// A word is a token holding a letter, like wordCount in corpus.ts; l'arbre and tree's count as one word, ranked by their longest run of letters.
function wordTokens(text: string): string[] {
  return text.split(/\s+/u).filter((token) => letters.test(token));
}

function letterCount(token: string): number {
  return Array.from(token.replace(/[^\p{L}]/gu, '')).length;
}

function rankOf(token: string, rankIndex: Map<string, number>, listLength: number): number {
  const longestRun = token.toLowerCase().split(nonLetters).reduce((longest, run) => (run.length > longest.length ? run : longest), '');
  return rankIndex.get(longestRun) ?? listLength;
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;
}

function measurePunctuationShare(text: string): number {
  const characters = Array.from(text.replace(/[\s\p{Nd}]+/gu, ''));
  if (characters.length === 0) return 0;
  return characters.filter((character) => !letters.test(character)).length / characters.length;
}

export function measureText(text: string, wordList: readonly string[]): TextMeasures {
  const tokens = wordTokens(text);
  const rankIndex = rankIndexOf(wordList);
  return {
    averageWordLength: average(tokens.map(letterCount)),
    averageRank: average(tokens.map((token) => rankOf(token, rankIndex, wordList.length))),
    punctuationShare: measurePunctuationShare(text),
  };
}

// The easiest level whose ceiling holds the value; above the medium ceiling a value is hard.
function levelOfValue(value: number, ceilings: { readonly easy: number; readonly medium: number }): ComplexityLevel {
  if (value <= ceilings.easy) return 'easy';
  return value <= ceilings.medium ? 'medium' : 'hard';
}

// A text is as hard as the hardest of its three criteria.
export function levelOfMeasures(measures: TextMeasures, language: TextLanguage): ComplexityLevel {
  const { ceilings } = gameConfig.text.complexity;
  const levels = [
    levelOfValue(measures.averageWordLength, ceilings.averageWordLength[language]),
    levelOfValue(measures.averageRank, ceilings.averageRank),
    levelOfValue(measures.punctuationShare, ceilings.punctuationShare),
  ];
  return complexityLevels[Math.max(...levels.map((level) => complexityLevels.indexOf(level)))]!;
}

export function classifyText(text: string, language: TextLanguage, wordList: readonly string[]): ComplexityLevel {
  return levelOfMeasures(measureText(text, wordList), language);
}
