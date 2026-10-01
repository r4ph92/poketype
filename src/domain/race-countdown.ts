import { gameConfig } from '@/config/game';

export type CountdownStep = 'get-ready' | 'go' | number;

const countdownMs = gameConfig.race.countdownSeconds * 1000;

export function countdownAt(startsAt: number, serverNow: number): CountdownStep {
  const remainingMs = startsAt - serverNow;
  if (remainingMs <= 0) return 'go';
  if (remainingMs > countdownMs) return 'get-ready';
  return Math.ceil(remainingMs / 1000);
}

export function msUntilNextCountdownChange(startsAt: number, serverNow: number): number | null {
  const remainingMs = startsAt - serverNow;
  if (remainingMs <= 0) return null;
  if (remainingMs > countdownMs) return remainingMs - countdownMs;
  return remainingMs - (Math.ceil(remainingMs / 1000) - 1) * 1000;
}
