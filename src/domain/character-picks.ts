import { gameConfig } from '@/config/game';
import type { TextLanguage } from './text-settings';

// The characters the host may require or forbid in random text (CONF-07): the lowercase letters, plus in French the accented letters,
// the cedilla and the ligature. English offers no accented character.
const frenchExtras = Array.from('àâçéèêëîïôùûüœ');

const latinLetters = Array.from('abcdefghijklmnopqrstuvwxyz');

export const pickableCharacters: Readonly<Record<TextLanguage, readonly string[]>> = { fr: [...latinLetters, ...frenchExtras], en: latinLetters };

export type CharacterPicks = { include: readonly string[]; exclude: readonly string[] };

export const noCharacterPicks: CharacterPicks = { include: [], exclude: [] };

// Each list holds offered characters only, each once, and no character is both required and forbidden.
export function areCharacterPicks(language: TextLanguage, include: unknown, exclude: unknown): boolean {
  if (!isCharacterList(language, include) || !isCharacterList(language, exclude)) return false;
  return include.every((character) => !exclude.includes(character));
}

function isCharacterList(language: TextLanguage, value: unknown): value is string[] {
  if (!Array.isArray(value) || value.length > pickableCharacters[language].length) return false;
  return value.every((character) => typeof character === 'string' && pickableCharacters[language].includes(character)) && new Set(value).size === value.length;
}

// In the offered order, so the same picks always store and compare the same way.
export function sortedPicks(language: TextLanguage, characters: readonly string[]): string[] {
  return pickableCharacters[language].filter((character) => characters.includes(character));
}

// Why the picks cannot give a text: too few words left after the exclusions, or required characters that no remaining word holds.
export type PickProblem = { kind: 'too-few-words' } | { kind: 'never-found'; characters: string[] };

export const requiredOccurrences = gameConfig.text.includedCharacterMinimum;

export function containsAny(word: string, characters: readonly string[]): boolean {
  return characters.some((character) => word.includes(character));
}
