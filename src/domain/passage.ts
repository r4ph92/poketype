// Code points, not UTF-16 units, so the client and the server count every character the same way.
export function passageCharacters(passage: string): string[] {
  return Array.from(passage);
}

export function passageLength(passage: string): number {
  return passageCharacters(passage).length;
}
