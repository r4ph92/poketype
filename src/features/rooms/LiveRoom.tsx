'use client';

import type { ReactNode } from 'react';
import type { RoomSnapshot } from '@/domain/room-view';
import { RaceStartView } from '@/features/race/RaceStartView';
import { useLiveRoom } from './live/use-live-room';
import { WaitingRoomView } from './WaitingRoomView';

type LiveRoomProps = { initial: RoomSnapshot; heading: ReactNode; invitation: ReactNode };

export function LiveRoom({ initial, heading, invitation }: LiveRoomProps) {
  const { snapshot, connection, isGone, clock } = useLiveRoom(initial);
  const isReconnecting = connection === 'reconnecting';
  if (snapshot.race && !isGone) {
    return <RaceStartView key={snapshot.race.id} roomId={snapshot.roomId} race={snapshot.race} clock={clock} members={snapshot.members} isReconnecting={isReconnecting} />;
  }
  return <WaitingRoomView snapshot={snapshot} isReconnecting={isReconnecting} isGone={isGone} heading={heading} invitation={invitation} />;
}
