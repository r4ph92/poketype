import { gameConfig } from '@/config/game';

export type LoginThrottleRules = { maxFailures: number; windowMinutes: number; lockMinutes: number };

const secondsPerMinute = 60;

// Ages are seconds before now on the database clock, newest failure first.
export function isLoginLocked(failureAgesSeconds: readonly number[], rules: LoginThrottleRules = gameConfig.account.loginThrottle): boolean {
  if (failureAgesSeconds.length < rules.maxFailures) return false;
  const newestAge = failureAgesSeconds[0]!;
  const oldestCountedAge = failureAgesSeconds[rules.maxFailures - 1]!;
  const isWithinWindow = oldestCountedAge - newestAge <= rules.windowMinutes * secondsPerMinute;
  return isWithinWindow && newestAge < rules.lockMinutes * secondsPerMinute;
}
