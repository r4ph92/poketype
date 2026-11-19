import { gameConfig } from '@/config/game';

const { gridSize, paletteCount } = gameConfig.avatar;
const patternColumns = Math.ceil(gridSize / 2);
const patternBits = patternColumns * gridSize;

export const avatarSeedLimit = 2 ** (patternBits + Math.log2(paletteCount));

export type AvatarCell = { column: number; row: number };

export type PixelAvatar = { cells: AvatarCell[]; paletteIndex: number };

export function isAvatarSeed(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < avatarSeedLimit;
}

export function pixelAvatarOf(seed: number): PixelAvatar {
  const paletteIndex = Math.floor(seed / 2 ** patternBits);
  return { cells: filledCells(seed % 2 ** patternBits), paletteIndex };
}

function filledCells(pattern: number): AvatarCell[] {
  const cells: AvatarCell[] = [];
  for (let bit = 0; bit < patternBits; bit++) {
    if (Math.floor(pattern / 2 ** bit) % 2 === 0) continue;
    cells.push(...mirroredPair({ column: Math.floor(bit / gridSize), row: bit % gridSize }));
  }
  return cells;
}

function mirroredPair(cell: AvatarCell): AvatarCell[] {
  const mirrored = { column: gridSize - 1 - cell.column, row: cell.row };
  return mirrored.column === cell.column ? [cell] : [cell, mirrored];
}
