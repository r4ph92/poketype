import { gameConfig } from '@/config/game';
import { areCharacterPicks } from './character-picks';
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

// length is the target number of characters; the options switch on what the text may contain (TXT-2, TXT-3). In coherent mode the
// length picks the closest passages and digits do not apply.
export type TextSettings = {
  kind: TextKind;
  errorMode: ErrorMode;
  // Characters random text must hold at least three times, and characters it must never hold (CONF-07); unused for coherent text.
  include: readonly string[];
  exclude: readonly string[];
  language: TextLanguage;
  length: number;
  punctuation: boolean;
  accents: boolean;
  capitals: boolean;
  digits: boolean;
};

export type TextOption = 'punctuation' | 'accents' | 'capitals' | 'digits';

export const textOptions: readonly TextOption[] = ['punctuation', 'accents', 'capitals', 'digits'];

export type LengthPreset = keyof typeof gameConfig.text.lengthPresets;

export const lengthPresets = Object.keys(gameConfig.text.lengthPresets) as LengthPreset[];

// Lowercase letters a child finds on a French keyboard: dedicated keys and the ^ dead key. No diaeresis, œ or æ.
export const raceWordPatterns: Record<TextLanguage, RegExp> = {
  fr: /^[a-zàâçéèêîôùû]{2,10}$/u,
  en: /^[a-z]{2,10}$/u,
};

export function isTextLanguage(value: unknown): value is TextLanguage {
  return textLanguages.some((language) => language === value);
}

export function defaultTextSettings(language: TextLanguage): TextSettings {
  return { kind: 'random', errorMode: 'blocked', include: [], exclude: [], language, length: gameConfig.text.defaultLength, ...gameConfig.text.defaultOptions };
}

export function isTextLength(value: unknown): value is number {
  const { minLength, maxLength, lengthStep } = gameConfig.text;
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minLength && value <= maxLength && (value - minLength) % lengthStep === 0;
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
  const { kind, errorMode, include, exclude, language, length, punctuation, accents, capitals, digits } = value;
  if (!isTextKind(kind) || !isErrorMode(errorMode) || !isTextLanguage(language) || !isTextLength(length)) return null;
  if (!areCharacterPicks(language, include, exclude)) return null;
  if (typeof punctuation !== 'boolean' || typeof accents !== 'boolean' || typeof capitals !== 'boolean' || typeof digits !== 'boolean') return null;
  return { kind, errorMode, include: include as string[], exclude: exclude as string[], language, length, punctuation, accents, capitals, digits };
}

export function areSameTextSettings(first: TextSettings, second: TextSettings): boolean {
  return (Object.keys(first) as (keyof TextSettings)[]).every((key) => String(first[key]) === String(second[key]));
}
