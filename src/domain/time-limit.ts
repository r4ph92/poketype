import { gameConfig } from '@/config/game';

// The host's maximum race duration in seconds, or null for none (CONF-01).
export type TimeLimit = number | null;

const { minSeconds, maxSeconds, stepSeconds, defaultSeconds, safetyCeilingSeconds } = gameConfig.race.timeLimit;

export const defaultTimeLimit: TimeLimit = defaultSeconds;

export const timeLimitRange = { minSeconds, maxSeconds, stepSeconds } as const;

export function isTimeLimit(value: unknown): value is TimeLimit {
  if (value === null) return true;
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minSeconds && value <= maxSeconds && (value - minSeconds) % stepSeconds === 0;
}

// A race without a limit still has a server deadline, the safety ceiling, so it can never stay open forever; nobody is shown a countdown for it.
export function raceDeadline(startsAt: Date, timeLimit: TimeLimit): Date {
  return new Date(startsAt.getTime() + (timeLimit ?? safetyCeilingSeconds) * 1000);
}
