import { gameConfig } from '@/config/game';
import { passageCharacters } from './passage';

const wordSeparator = ' ';

const letter = /\p{L}/u;

// What the bot reads at each position of its text: whether a word starts there and whether that character belongs to a long word.
export type BotTextCharacter = { startsWord: boolean; inLongWord: boolean };

export function readBotText(text: string): BotTextCharacter[] {
  const characters = passageCharacters(text);
  const longWords = longWordFlags(characters);
  return characters.map((character, index) => ({
    startsWord: character !== wordSeparator && (index === 0 || characters[index - 1] === wordSeparator),
    inLongWord: longWords[index]!,
  }));
}

// A word is everything between two spaces; only its letters count towards its length, so "l'arbre," is six letters long.
function longWordFlags(characters: readonly string[]): boolean[] {
  const flags = Array<boolean>(characters.length).fill(false);
  let wordStart = 0;
  for (let index = 0; index <= characters.length; index += 1) {
    if (index < characters.length && characters[index] !== wordSeparator) continue;
    const isLong = countLetters(characters.slice(wordStart, index)) >= gameConfig.bots.longWord.minLetters;
    flags.fill(isLong, wordStart, index);
    wordStart = index + 1;
  }
  return flags;
}

function countLetters(word: readonly string[]): number {
  return word.filter((character) => letter.test(character)).length;
}
