export type RandomIndex = (count: number) => number;

export function pickPassage(passages: readonly string[], randomIndex: RandomIndex): string {
  const passage = passages[randomIndex(passages.length)];
  if (passage === undefined) throw new RangeError('The random index fell outside the passage list.');
  return passage.normalize('NFC');
}

// A room racing again gets a different text than its previous race, unless the list holds nothing else.
export function pickNextPassage(passages: readonly string[], previousPassage: string | null, randomIndex: RandomIndex): string {
  const fresh = passages.filter((passage) => passage.normalize('NFC') !== previousPassage);
  return pickPassage(fresh.length > 0 ? fresh : passages, randomIndex);
}

// Code points, not UTF-16 units, so the client and the server count every character the same way.
export function passageCharacters(passage: string): string[] {
  return Array.from(passage);
}

export function passageLength(passage: string): number {
  return passageCharacters(passage).length;
}
