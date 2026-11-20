import { passageLength } from './passage';

const wordSeparator = ' ';

export function racerText(passage: string, wordsRemoved: number): string {
  let end = passage.length;
  for (let removed = 0; removed < wordsRemoved; removed += 1) {
    const separator = passage.lastIndexOf(wordSeparator, end - 1);
    if (separator <= 0) return passage.slice(0, end);
    end = separator;
  }
  return passage.slice(0, end);
}

export function racerTextLength(passage: string, wordsRemoved: number): number {
  return passageLength(racerText(passage, wordsRemoved));
}

// One unreached word always stays, so a bonus never ends anyone's race by itself.
export function removableWordCount(text: string, position: number, wanted: number): number {
  const unreachedWords = laterWordStartsOf(text).filter((start) => start > position).length;
  return Math.max(0, Math.min(wanted, unreachedWords - 1));
}

function laterWordStartsOf(text: string): number[] {
  const characters = Array.from(text);
  return characters.flatMap((character, index) => (character === wordSeparator && index + 1 < characters.length ? [index + 1] : []));
}
