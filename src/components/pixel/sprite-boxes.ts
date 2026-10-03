import type { FrameSize } from './sprite-sheet';

export type SpriteBox = FrameSize & { maxScale: 1 | 2 | 3 };

// Every box holds the largest frame of the catalogue at scale 1 (96 × 128), checked by a unit test, so a giant is never clipped.
// Smaller Pokémon are drawn at the largest whole-number scale that fits, up to maxScale, centred in the box.
export const spriteBoxes = {
  lobbyCard: { width: 128, height: 128, maxScale: 3 },
  lobbyProfile: { width: 192, height: 192, maxScale: 3 },
  resultsRow: { width: 96, height: 128, maxScale: 2 },
  racePartner: { width: 96, height: 128, maxScale: 2 },
  campPartner: { width: 128, height: 128, maxScale: 2 },
} as const satisfies Record<string, SpriteBox>;
