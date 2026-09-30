'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { roomEntryPath } from '@/domain/room-id';
import type { RoomSnapshot } from '@/domain/room-view';
import { subscribeToRoom, type RoomConnection } from './room-subscription';

export type LiveRoom = { snapshot: RoomSnapshot; connection: RoomConnection; isGone: boolean };

export function useLiveRoom(initial: RoomSnapshot): LiveRoom {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [connection, setConnection] = useState<RoomConnection>('live');
  const [isGone, setIsGone] = useState(false);
  const { roomId, revision } = initial;

  useEffect(() => {
    return subscribeToRoom(roomId, revision, {
      onSnapshot: setSnapshot,
      onConnectionChange: setConnection,
      onGone: () => setIsGone(true),
      onSessionEnded: () => router.replace(roomEntryPath(roomId)),
    });
  }, [roomId, revision, router]);

  return { snapshot, connection, isGone };
}
