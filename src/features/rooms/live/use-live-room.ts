'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { gameConfig } from '@/config/game';
import { roomEntryPath } from '@/domain/room-id';
import type { PublicPushConfig } from '@/domain/push-config';
import type { RoomSnapshot } from '@/domain/room-view';
import { ServerClock } from '@/domain/server-clock';
import type { RoomConnection } from './room-subscription';
import { subscribeToRoom } from './subscribe-to-room';

export type LiveRoom = { snapshot: RoomSnapshot; connection: RoomConnection; isGone: boolean; clock: ServerClock };

export function useLiveRoom(initial: RoomSnapshot, pushConfig: PublicPushConfig | null): LiveRoom {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [connection, setConnection] = useState<RoomConnection>('live');
  const [isGone, setIsGone] = useState(false);
  const [clock, setClock] = useState(() => ServerClock.empty(gameConfig.roomSync.clockSampleWindow));
  const { roomId } = initial;

  // A refresh of the page brings a newer server snapshot than the one polled so far.
  if (initial.revision > snapshot.revision) setSnapshot(initial);

  useEffect(() => {
    return subscribeToRoom(pushConfig)(roomId, initial.revision, {
      onSnapshot: (next) => setSnapshot((shown) => (next.revision > shown.revision ? next : shown)),
      onServerTime: (sample) => setClock((current) => current.withSample(sample)),
      onConnectionChange: setConnection,
      onGone: () => setIsGone(true),
      onNoLongerMember: () => router.replace(roomEntryPath(roomId)),
      onSessionEnded: () => router.replace(roomEntryPath(roomId)),
    });
  }, [roomId, initial.revision, router, pushConfig]);

  return { snapshot, connection, isGone, clock };
}
