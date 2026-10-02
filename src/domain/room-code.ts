export type RoomCode = string & { readonly __brand: 'RoomCode' };

// No O, 0, I or 1: a child reading the code aloud or copying it from a screen cannot confuse them.
export const roomCodeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const roomCodeLength = 6;

export const roomCodePattern = new RegExp(`^[${roomCodeAlphabet}]{${roomCodeLength}}$`);

const whitespace = /\s+/g;

export function parseRoomCode(value: unknown): RoomCode | null {
  return typeof value === 'string' && roomCodePattern.test(value) ? (value as RoomCode) : null;
}

// What a player types: any letter case, with spaces anywhere.
export function normalizeRoomCode(typed: string): RoomCode | null {
  return parseRoomCode(typed.replace(whitespace, '').toUpperCase());
}

export function generateRoomCode(randomIndex: (alphabetSize: number) => number): RoomCode {
  const characters = Array.from({ length: roomCodeLength }, () => roomCodeAlphabet[randomIndex(roomCodeAlphabet.length)]);
  return characters.join('') as RoomCode;
}
