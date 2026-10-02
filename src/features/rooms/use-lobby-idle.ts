'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { isLobbyIdleAt, type LobbyIdle } from '@/domain/lobby-idle';
import type { ServerClock } from '@/domain/server-clock';
import { wakeAtEachChange } from '@/features/race/wake-on-server-time';

// Timed on the server clock, never the wall clock; false until the clock is known.
export function useIsLobbyIdle(lobbyIdle: LobbyIdle | null, clock: ServerClock): boolean {
  const subscribe = useCallback(
    (notify: () => void) => (lobbyIdle ? wakeAtEachChange(clock, (serverNow) => msUntilIdle(lobbyIdle, serverNow), notify) : () => {}),
    [lobbyIdle, clock],
  );
  const getSnapshot = useCallback(() => isIdleNow(lobbyIdle, clock), [lobbyIdle, clock]);
  return useSyncExternalStore(subscribe, getSnapshot, notIdleBeforeTheClockIsKnown);
}

function msUntilIdle(lobbyIdle: LobbyIdle, serverNow: number): number | null {
  return isLobbyIdleAt(lobbyIdle, serverNow) ? null : lobbyIdle.idleAt - serverNow;
}

function isIdleNow(lobbyIdle: LobbyIdle | null, clock: ServerClock): boolean {
  const serverNow = clock.serverNowAt(performance.now());
  return lobbyIdle !== null && serverNow !== null && isLobbyIdleAt(lobbyIdle, serverNow);
}

function notIdleBeforeTheClockIsKnown(): boolean {
  return false;
}
