'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { countdownAt, msUntilNextCountdownChange, type CountdownStep } from '@/domain/race-countdown';
import type { ServerClock } from '@/domain/server-clock';

// The timer only wakes the view; the step shown is always recomputed from the server start time, so a late or throttled timer never shows a wrong number.
export function useRaceCountdown(startsAt: number, clock: ServerClock): CountdownStep {
  const subscribe = useCallback((notify: () => void) => wakeAtEachCountdownChange(startsAt, clock, notify), [startsAt, clock]);
  const getSnapshot = useCallback(() => currentStep(startsAt, clock), [startsAt, clock]);
  return useSyncExternalStore(subscribe, getSnapshot, stepBeforeTheClockIsKnown);
}

function stepBeforeTheClockIsKnown(): CountdownStep {
  return 'get-ready';
}

function currentStep(startsAt: number, clock: ServerClock): CountdownStep {
  const serverNow = clock.serverNowAt(performance.now());
  return serverNow === null ? stepBeforeTheClockIsKnown() : countdownAt(startsAt, serverNow);
}

function wakeAtEachCountdownChange(startsAt: number, clock: ServerClock, notify: () => void): () => void {
  let timer: number | undefined;
  const scheduleNextWakeUp = () => {
    const serverNow = clock.serverNowAt(performance.now());
    const delayMs = serverNow === null ? null : msUntilNextCountdownChange(startsAt, serverNow);
    if (delayMs === null) return;
    timer = window.setTimeout(() => {
      notify();
      scheduleNextWakeUp();
    }, delayMs);
  };
  scheduleNextWakeUp();
  return () => window.clearTimeout(timer);
}
