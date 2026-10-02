'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { gameConfig } from '@/config/game';
import { roomEntryPath } from '@/domain/room-id';
import type { PublicPushConfig } from '@/domain/push-config';
import type { RoomSnapshot } from '@/domain/room-view';
import { ServerClock } from '@/domain/server-clock';
import type { RoomConnection } from './room-subscription';
import { subscribeToRoom } from './subscribe-to-room';

export type RoomExit = { start: () => void; cancel: () => void; finish: () => void };
export type LiveRoom = { snapshot: RoomSnapshot; connection: RoomConnection; clock: ServerClock; exit: RoomExit };

export const roomClosedPath = '/play?closed=1';

export function useLiveRoom(initial: RoomSnapshot, pushConfig: PublicPushConfig | null): LiveRoom {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [connection, setConnection] = useState<RoomConnection>('live');
  const [isLeaving, setIsLeaving] = useState(false);
  const isLeavingNow = useRef(false);
  const [clock, setClock] = useState(() => ServerClock.empty(gameConfig.roomSync.clockSampleWindow));
  const { roomId } = initial;

  // A refresh of the page brings a newer server snapshot than the one polled so far.
  if (initial.revision > snapshot.revision) setSnapshot(initial);

  useEffect(() => {
    if (isLeaving) return;
    return subscribeToRoom(pushConfig)(roomId, initial.revision, {
      onSnapshot: (next) => setSnapshot((shown) => (next.revision > shown.revision ? next : shown)),
      onServerTime: (sample) => setClock((current) => current.withSample(sample)),
      onConnectionChange: setConnection,
      onGone: () => router.replace(roomClosedPath),
      onNoLongerMember: () => {
        if (!isLeavingNow.current) router.replace(roomEntryPath(roomId));
      },
      onSessionEnded: () => router.replace(roomEntryPath(roomId)),
    });
  }, [roomId, initial.revision, router, pushConfig, isLeaving]);

  // Updates stop before the leave request is sent: a poll or push answered after the server removed the leaver
  // would otherwise send them to the room entry, which joins the still-waiting room again.
  const exit: RoomExit = {
    start: () => {
      isLeavingNow.current = true;
      setIsLeaving(true);
    },
    cancel: () => {
      isLeavingNow.current = false;
      setIsLeaving(false);
    },
    finish: () => router.replace('/play'),
  };

  return { snapshot, connection, clock, exit };
}
