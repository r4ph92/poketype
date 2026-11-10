import { z } from 'zod';
import { gameConfig } from '@/config/game';

const counter = z.number().int().min(0).max(gameConfig.race.maxProgressCounter);

export const progressReportRequestSchema = z.strictObject({
  sequence: counter.min(1),
  position: counter,
  keystrokes: counter,
  rejectedKeystrokes: counter,
});
