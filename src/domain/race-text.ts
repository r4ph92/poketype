import { gameConfig } from '@/config/game';
import type { CoherentLimits } from './coherent-limit';
import { containsAny, requiredOccurrences, type PickProblem } from './character-picks';
import { classifyText, type ComplexityLevel } from './text-complexity';
import type { TextLanguage, TextSettings } from './text-settings';

export type RandomIndex = (count: number) => number;

export type WordLists = Readonly<Record<TextLanguage, readonly string[]>>;

// missing counts, per required character, how many more times it must appear; the draw favours words that hold one of them.
type Draw = { settings: TextSettings; chances: LevelSettings; words: readonly string[]; plainInitialWords: readonly string[]; elisions: readonly string[]; random: RandomIndex; missing: Map<string, number> };

const tuning = gameConfig.text;

type LevelSettings = (typeof tuning.complexity.levels)[ComplexityLevel];

const frenchElisions = ["l'", "d'", "j'", "n'", "s'", "qu'", "c'", "m'", "t'"] as const;

const elidingInitial = /^[aeiouhàâéèêîôû]/u;

const plainWord = /^[a-z]+$/u;

const plainInitial = /^[a-z]/u;

// Real words in a random order, so the sentences make no sense: the text trains typing, not reading.
// It holds exactly settings.wordCount words, a number or an elided word (l'arbre) counting as one; with punctuation, the last sentence is closed with a period.
// Excluded characters never appear; each included one appears at least three times, the text being drawn again if needed (CONF-07).
// The words come from the level's range of the frequency list and the text is drawn again until it measures at the chosen level (CONF-05).
// null when no word of the level can give the picks, or when every attempt missed that quota or that level: a race never starts with such a text.
// textPickProblem tells beforehand when the picks cannot give one.
export function generateRaceText(settings: TextSettings, wordLists: WordLists, random: RandomIndex): string | null {
  if (wordsProblem(settings, wordLists) !== null) return null;
  for (let attempt = 0; attempt < tuning.textAttempts; attempt += 1) {
    const text = drawText(settings, wordLists, random);
    if (hasEveryIncluded(text, settings.include) && isAtChosenLevel(text, settings, wordLists)) return text;
  }
  return null;
}

function coherentTextProblem({ language, complexity, wordCount }: TextSettings, limits: CoherentLimits): PickProblem | null {
  return wordCount > limits[language][complexity] ? { kind: 'coherent-too-long' } : null;
}

// null when the picks can give a text; checked before a race starts, in the lobby and on the server.
export function textPickProblem(settings: TextSettings, wordLists: WordLists, limits: CoherentLimits): PickProblem | null {
  if (settings.kind === 'coherent') return coherentTextProblem(settings, limits);
  const problem = wordsProblem(settings, wordLists);
  if (problem !== null) return problem;
  return settings.include.length > 0 && generateRaceText(settings, wordLists, probeRandomIndex()) === null ? { kind: 'picks-too-rare' } : null;
}

// What the words of the level leave: too few of them, or a required character that none holds.
function wordsProblem(settings: TextSettings, wordLists: WordLists): PickProblem | null {
  const words = usableWords(settings, wordLists[settings.language]);
  if (words.length < tuning.minimumWords) return { kind: 'too-few-words' };
  const neverFound = settings.include.filter((character) => !words.some((word) => word.includes(character)));
  return neverFound.length > 0 ? { kind: 'never-found', characters: neverFound } : null;
}

// The same draws on every call, so the lobby and the server agree on whether the picks can fit the level, and a render never changes its mind.
function probeRandomIndex(): RandomIndex {
  let state = 20_261_119;
  return (count) => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return Math.floor((state / 4_294_967_296) * count);
  };
}

function drawText(settings: TextSettings, wordLists: WordLists, random: RandomIndex): string {
  const draw = drawFrom(settings, wordLists[settings.language], random);
  const text = fillTokens(draw, settings.wordCount).join(' ');
  return (settings.punctuation ? endSentence(text) : text).normalize('NFC');
}

function isAtChosenLevel(text: string, { language, complexity }: TextSettings, wordLists: WordLists): boolean {
  return classifyText(text, language, wordLists[language]) === complexity;
}

function hasEveryIncluded(text: string, include: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return include.every((character) => occurrences(lower, character) >= requiredOccurrences);
}

function occurrences(text: string, character: string): number {
  return text.split(character).length - 1;
}

// The words of the level's rank range and length; without accents, only plain words; an excluded character removes every word holding it.
function usableWords({ accents, exclude, complexity }: TextSettings, list: readonly string[]): string[] {
  const { rank, wordLength } = tuning.complexity.levels[complexity];
  return list
    .slice(rank.from, rank.to)
    .filter((word) => Array.from(word).length >= wordLength.min && Array.from(word).length <= wordLength.max)
    .filter((word) => (accents || plainWord.test(word)) && !containsAny(word, exclude));
}

function drawFrom(settings: TextSettings, list: readonly string[], random: RandomIndex): Draw {
  const words = usableWords(settings, list);
  const elisions = frenchElisions.filter((elision) => !containsAny(elision, settings.exclude));
  const missing = new Map(settings.include.map((character) => [character, requiredOccurrences]));
  return { settings, chances: tuning.complexity.levels[settings.complexity], words, plainInitialWords: words.filter((word) => plainInitial.test(word)), elisions, random, missing };
}

function fillTokens(draw: Draw, wordCount: number): string[] {
  const tokens: string[] = [];
  while (tokens.length < wordCount) tokens.push(...sentenceTokens(draw).slice(0, wordCount - tokens.length));
  return tokens;
}

function sentenceTokens(draw: Draw): string[] {
  const count = between(draw.random, tuning.sentenceWords.min, tuning.sentenceWords.max);
  const endMark = chance(draw.random, draw.chances.questionChance) ? '?' : '.';
  return Array.from({ length: count }, (_, index) => {
    const token = coreToken(draw, index === 0);
    if (!draw.settings.punctuation) return token;
    if (index === count - 1) return token + endMark;
    return chance(draw.random, draw.chances.commaChance) ? `${token},` : token;
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
  const joined = draw.settings.punctuation && chance(draw.random, draw.chances.apostropheChance) ? withApostrophe(draw, word) : word;
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
