'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { gameConfig } from '@/config/game';
import type { ServerClock } from '@/domain/server-clock';
import { wakeAtEachChange } from './wake-on-server-time';

const tickMs = gameConfig.bots.displayTickMs;

type RaceWindow = { startsAt: number; deadlineAt: number };

// Milliseconds since the start on the server clock, in display ticks, while bots race; null until the clock is known.
export function useBotRaceTime({ startsAt, deadlineAt }: RaceWindow, clock: ServerClock, hasBots: boolean): number | null {
  const subscribe = useCallback(
    (notify: () => void) => wakeAtEachChange(clock, (serverNow) => (hasBots && serverNow < deadlineAt ? msUntilNextTick(serverNow - startsAt) : null), notify),
    [startsAt, deadlineAt, clock, hasBots],
  );
  const getSnapshot = useCallback(() => currentTick(startsAt, clock), [startsAt, clock]);
  return useSyncExternalStore(subscribe, getSnapshot, noTimeBeforeTheClockIsKnown);
}

function msUntilNextTick(elapsedMs: number): number {
  if (elapsedMs < 0) return -elapsedMs;
  return tickMs - (elapsedMs % tickMs);
}

function currentTick(startsAt: number, clock: ServerClock): number | null {
  const serverNow = clock.serverNowAt(performance.now());
  return serverNow === null ? null : Math.floor((serverNow - startsAt) / tickMs) * tickMs;
}

function noTimeBeforeTheClockIsKnown(): null {
  return null;
}
