import { gameConfig } from '@/config/game';
import { areCharacterPicks } from './character-picks';
import { defaultComplexityLevel, isComplexityLevel, type ComplexityLevel } from './text-complexity';
import { isJsonObject } from './json-guards';

// The language of the race text, chosen by the host independently of anyone's interface language (TXT-1).
export const textLanguages = ['fr', 'en'] as const;

export type TextLanguage = (typeof textLanguages)[number];

export const defaultTextLanguage: TextLanguage = 'fr';

// random: shuffled dictionary words; coherent: a real public-domain passage from the corpus (CONF-03, #34).
export const textKinds = ['random', 'coherent'] as const;

export type TextKind = (typeof textKinds)[number];

export function isTextKind(value: unknown): value is TextKind {
  return textKinds.some((kind) => kind === value);
}

// blocked: "Correction obligatoire", a wrong character never enters and the cursor waits for the right one (the default, JEU-2 baseline);
// free: "Libre", a wrong character is kept in red, the cursor moves on, and Backspace corrects it (CONF-08, #32).
export const errorModes = ['blocked', 'free'] as const;

export type ErrorMode = (typeof errorModes)[number];

export function isErrorMode(value: unknown): value is ErrorMode {
  return errorModes.some((mode) => mode === value);
}

// wordCount is how many words the text holds (CONF-04); the options switch on what the text may contain (TXT-2, TXT-3). In coherent mode
// the text is the first words of a passage that has enough of them, and digits do not apply.
export type TextSettings = {
  kind: TextKind;
  errorMode: ErrorMode;
  // Characters random text must hold at least three times, and characters it must never hold (CONF-07); unused for coherent text.
  include: readonly string[];
  exclude: readonly string[];
  language: TextLanguage;
  wordCount: number;
  // How hard the words are to type (CONF-05): see text-complexity.ts.
  complexity: ComplexityLevel;
  punctuation: boolean;
  accents: boolean;
  capitals: boolean;
  digits: boolean;
};

export type TextOption = 'punctuation' | 'accents' | 'capitals' | 'digits';

export const textOptions: readonly TextOption[] = ['punctuation', 'accents', 'capitals', 'digits'];

export type WordCountPreset = keyof typeof gameConfig.text.wordCountPresets;

export const wordCountPresets = Object.keys(gameConfig.text.wordCountPresets) as WordCountPreset[];

// Lowercase letters a child finds on a French keyboard: dedicated keys and the ^ dead key. No diaeresis, œ or æ.
export const raceWordPatterns: Record<TextLanguage, RegExp> = {
  fr: /^[a-zàâçéèêîôùû]{2,10}$/u,
  en: /^[a-z]{2,10}$/u,
};

export function isTextLanguage(value: unknown): value is TextLanguage {
  return textLanguages.some((language) => language === value);
}

export function defaultTextSettings(language: TextLanguage): TextSettings {
  return { kind: 'random', errorMode: 'blocked', include: [], exclude: [], language, wordCount: gameConfig.text.wordCount.default, complexity: defaultComplexityLevel, ...gameConfig.text.defaultOptions };
}

export function isWordCount(value: unknown): value is number {
  const { min, max } = gameConfig.text.wordCount;
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}

// Digits are only drawn into random text; a real passage keeps its own words.
export function usesDigitsOption(kind: TextKind): boolean {
  return kind === 'random';
}

// Accents only change a French text: the English list holds no accented word.
export function usesAccentOption(language: TextLanguage): boolean {
  return language === 'fr';
}

export function parseTextSettings(value: unknown): TextSettings | null {
  if (!isJsonObject(value)) return null;
  const { kind, errorMode, include, exclude, language, wordCount, complexity, punctuation, accents, capitals, digits } = value;
  if (!isTextKind(kind) || !isErrorMode(errorMode) || !isTextLanguage(language) || !isWordCount(wordCount) || !isComplexityLevel(complexity)) return null;
  if (!areCharacterPicks(language, include, exclude)) return null;
  if (typeof punctuation !== 'boolean' || typeof accents !== 'boolean' || typeof capitals !== 'boolean' || typeof digits !== 'boolean') return null;
  return { kind, errorMode, include: include as string[], exclude: exclude as string[], language, wordCount, complexity, punctuation, accents, capitals, digits };
}

export function areSameTextSettings(first: TextSettings, second: TextSettings): boolean {
  return (Object.keys(first) as (keyof TextSettings)[]).every((key) => String(first[key]) === String(second[key]));
}
