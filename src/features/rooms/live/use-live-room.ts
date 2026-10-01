'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { roomEntryPath } from '@/domain/room-id';
import type { RoomSnapshot } from '@/domain/room-view';
import type { RoomConnection } from './room-subscription';
import { subscribeToRoom } from './subscribe-to-room';

export type LiveRoom = { snapshot: RoomSnapshot; connection: RoomConnection; isGone: boolean };

export function useLiveRoom(initial: RoomSnapshot): LiveRoom {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [connection, setConnection] = useState<RoomConnection>('live');
  const [isGone, setIsGone] = useState(false);
  const displayedRevision = useRef(initial.revision);
  const { roomId } = initial;

  // A refresh of the page brings a newer server snapshot than the one polled so far.
  if (initial.revision > snapshot.revision) setSnapshot(initial);

  useEffect(() => {
    displayedRevision.current = snapshot.revision;
  });

  useEffect(() => {
    return subscribeToRoom(roomId, displayedRevision.current, {
      onSnapshot: (next) => setSnapshot((shown) => (next.revision > shown.revision ? next : shown)),
      onConnectionChange: setConnection,
      onGone: () => setIsGone(true),
      onNoLongerMember: () => router.replace(roomEntryPath(roomId)),
      onSessionEnded: () => router.replace(roomEntryPath(roomId)),
    });
  }, [roomId, initial.revision, router]);

  return { snapshot, connection, isGone };
}
