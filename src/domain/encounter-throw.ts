import type { PokedexDex } from '@/assets/pokedex';
import { gameConfig } from '@/config/game';
import { maxThrowsFor, type EncounterStatus } from './wild-encounter';

const { maxThrows } = gameConfig.encounters;

// gone covers an encounter that is not the trainer's, already closed, or a throw sent for a turn that has passed.
export type ThrowResult =
  | { outcome: 'caught' | 'fled'; dex: PokedexDex }
  | { outcome: 'missed'; dex: PokedexDex; throwsLeft: number }
  | { outcome: 'no-ball' | 'pc-full' | 'gone' };

export function statusAfterThrow(dex: PokedexDex, caught: boolean, throwNumber: number): EncounterStatus {
  if (caught) return 'caught';
  return throwNumber >= maxThrowsFor(dex) ? 'fled' : 'waiting';
}

export function throwResultOf(dex: PokedexDex, caught: boolean, throwNumber: number): ThrowResult {
  const status = statusAfterThrow(dex, caught, throwNumber);
  if (status === 'waiting') return { outcome: 'missed', dex, throwsLeft: maxThrowsFor(dex) - throwNumber };
  return { outcome: status === 'caught' ? 'caught' : 'fled', dex };
}

// The form sends the throw it means (1 to maxThrows), so a double click sends the same throw twice and the server spends one ball.
export function parseThrowNumber(value: unknown): number | null {
  const throwNumber = typeof value === 'string' && /^\d$/.test(value) ? Number(value) : NaN;
  return throwNumber >= 1 && throwNumber <= maxThrows ? throwNumber : null;
}
