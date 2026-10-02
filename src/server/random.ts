import { randomInt } from 'node:crypto';
import type { RandomSource } from '@/domain/wild-encounter';

const resolution = 2 ** 32;

export const secureRandom: RandomSource = () => randomInt(resolution) / resolution;
