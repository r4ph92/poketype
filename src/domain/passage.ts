export type RandomIndex = (count: number) => number;

export function pickPassage(passages: readonly string[], randomIndex: RandomIndex): string {
  const passage = passages[randomIndex(passages.length)];
  if (passage === undefined) throw new RangeError('The random index fell outside the passage list.');
  return passage.normalize('NFC');
}
