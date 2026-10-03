import { randomInt } from 'node:crypto';
import type { RandomSource } from '@/domain/random-source';

const resolution = 2 ** 32;

export const secureRandom: RandomSource = () => randomInt(resolution) / resolution;
