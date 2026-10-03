'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { msUntilNextInactivity, removableRacerKeys } from '@/domain/race-inactivity';
import type { RoomMemberView } from '@/domain/room-view';
import type { ServerClock } from '@/domain/server-clock';
import { wakeAtEachChange } from './wake-on-server-time';

const keySeparator = ' ';

// The member keys the host may remove as inactive, recomputed on the server clock whenever a racer crosses the mark. Empty for everyone else.
export function useRemovableRacers(members: readonly RoomMemberView[], startsAt: number, clock: ServerClock, isHost: boolean): ReadonlySet<string> {
  const subscribe = useCallback(
    (notify: () => void) => wakeAtEachChange(clock, (serverNow) => msUntilNextInactivity(members, startsAt, serverNow), notify),
    [members, startsAt, clock],
  );
  const getSnapshot = useCallback(() => (isHost ? removableNow(members, startsAt, clock) : ''), [members, startsAt, clock, isHost]);
  const joinedKeys = useSyncExternalStore(subscribe, getSnapshot, noneBeforeTheClockIsKnown);
  return new Set(joinedKeys.split(keySeparator).filter((key) => key.length > 0));
}

function noneBeforeTheClockIsKnown(): string {
  return '';
}

function removableNow(members: readonly RoomMemberView[], startsAt: number, clock: ServerClock): string {
  const serverNow = clock.serverNowAt(performance.now());
  return serverNow === null ? '' : removableRacerKeys(members, startsAt, serverNow).join(keySeparator);
}
