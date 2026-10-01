'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { gameConfig } from '@/config/game';
import { roomEntryPath } from '@/domain/room-id';
import type { RoomSnapshot } from '@/domain/room-view';
import { ServerClock } from '@/domain/server-clock';
import type { RoomConnection } from './room-subscription';
import { subscribeToRoom } from './subscribe-to-room';

export type LiveRoom = { snapshot: RoomSnapshot; connection: RoomConnection; clock: ServerClock; leaveToPlay: () => void };

export const roomClosedPath = '/play?closed=1';

export function useLiveRoom(initial: RoomSnapshot): LiveRoom {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [connection, setConnection] = useState<RoomConnection>('live');
  const [hasLeft, setHasLeft] = useState(false);
  const [clock, setClock] = useState(() => ServerClock.empty(gameConfig.roomSync.clockSampleWindow));
  const { roomId } = initial;

  // A refresh of the page brings a newer server snapshot than the one polled so far.
  if (initial.revision > snapshot.revision) setSnapshot(initial);

  useEffect(() => {
    if (hasLeft) return;
    return subscribeToRoom(roomId, initial.revision, {
      onSnapshot: (next) => setSnapshot((shown) => (next.revision > shown.revision ? next : shown)),
      onServerTime: (sample) => setClock((current) => current.withSample(sample)),
      onConnectionChange: setConnection,
      onGone: () => router.replace(roomClosedPath),
      onNoLongerMember: () => router.replace(roomEntryPath(roomId)),
      onSessionEnded: () => router.replace(roomEntryPath(roomId)),
    });
  }, [roomId, initial.revision, router, hasLeft]);

  // Polling stops first: a poll that saw the leaver gone would otherwise send them straight back into the room.
  function leaveToPlay(): void {
    setHasLeft(true);
    router.replace('/play');
  }

  return { snapshot, connection, clock, leaveToPlay };
}
