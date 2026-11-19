import { z } from 'zod';
import { gameConfig } from '@/config/game';

const counter = z.number().int().min(0).max(gameConfig.race.maxProgressCounter);

export const progressReportRequestSchema = z.strictObject({
  sequence: counter.min(1),
  position: counter,
  correctCharacters: counter,
  keystrokes: counter,
  rejectedKeystrokes: counter,
  // Optional so a page loaded before #74 keeps racing; its misses are then counted as errors without a character.
  missedPositions: z.array(counter).max(gameConfig.missedKeys.maxPositionsPerReport).default([]),
});
