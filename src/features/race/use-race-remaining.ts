'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { msUntilNextRemainingChange, remainingSecondsAt } from '@/domain/race-remaining';
import type { ServerClock } from '@/domain/server-clock';
import { wakeAtEachChange } from './wake-on-server-time';

// Like the countdown, the timer only wakes the view; the seconds shown are always recomputed from the server deadline. null until the clock is known.
export function useRaceRemaining(deadlineAt: number, clock: ServerClock): number | null {
  const subscribe = useCallback(
    (notify: () => void) => wakeAtEachChange(clock, (serverNow) => msUntilNextRemainingChange(deadlineAt, serverNow), notify),
    [deadlineAt, clock],
  );
  const getSnapshot = useCallback(() => currentRemaining(deadlineAt, clock), [deadlineAt, clock]);
  return useSyncExternalStore(subscribe, getSnapshot, remainingBeforeTheClockIsKnown);
}

function remainingBeforeTheClockIsKnown(): null {
  return null;
}

function currentRemaining(deadlineAt: number, clock: ServerClock): number | null {
  const serverNow = clock.serverNowAt(performance.now());
  return serverNow === null ? null : remainingSecondsAt(deadlineAt, serverNow);
}
