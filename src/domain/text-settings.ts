import { gameConfig } from '@/config/game';
import { isJsonObject } from './json-guards';

// The language of the race text, chosen by the host independently of anyone's interface language (TXT-1).
export const textLanguages = ['fr', 'en'] as const;

export type TextLanguage = (typeof textLanguages)[number];

export const defaultTextLanguage: TextLanguage = 'fr';

// length is the target number of characters; the options switch on what the text may contain (TXT-2, TXT-3).
export type TextSettings = {
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
  return { language, length: gameConfig.text.defaultLength, ...gameConfig.text.defaultOptions };
}

export function isTextLength(value: unknown): value is number {
  const { minLength, maxLength, lengthStep } = gameConfig.text;
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minLength && value <= maxLength && (value - minLength) % lengthStep === 0;
}

// Accents only change a French text: the English list holds no accented word.
export function usesAccentOption(language: TextLanguage): boolean {
  return language === 'fr';
}

export function parseTextSettings(value: unknown): TextSettings | null {
  if (!isJsonObject(value)) return null;
  const { language, length, punctuation, accents, capitals, digits } = value;
  if (!isTextLanguage(language) || !isTextLength(length)) return null;
  if (typeof punctuation !== 'boolean' || typeof accents !== 'boolean' || typeof capitals !== 'boolean' || typeof digits !== 'boolean') return null;
  return { language, length, punctuation, accents, capitals, digits };
}

export function areSameTextSettings(first: TextSettings, second: TextSettings): boolean {
  return (Object.keys(first) as (keyof TextSettings)[]).every((key) => first[key] === second[key]);
}
