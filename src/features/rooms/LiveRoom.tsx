'use client';

import type { ReactNode } from 'react';
import type { PublicPushConfig } from '@/domain/push-config';
import type { RoomSnapshot } from '@/domain/room-view';
import { RaceResultsView } from '@/features/race/RaceResultsView';
import { RaceStartView } from '@/features/race/RaceStartView';
import { useLiveRoom } from './live/use-live-room';
import { WaitingRoomView } from './WaitingRoomView';

type LiveRoomProps = { initial: RoomSnapshot; pushConfig: PublicPushConfig | null; heading: ReactNode; invitation: ReactNode };

export function LiveRoom({ initial, pushConfig, heading, invitation }: LiveRoomProps) {
  const { snapshot, connection, isGone, clock } = useLiveRoom(initial, pushConfig);
  const isReconnecting = connection === 'reconnecting';
  if (snapshot.race?.results && !isGone) return <RaceResultsView results={snapshot.race.results} members={snapshot.members} />;
  if (snapshot.race && !isGone) {
    return <RaceStartView key={snapshot.race.id} roomId={snapshot.roomId} race={snapshot.race} clock={clock} members={snapshot.members} isReconnecting={isReconnecting} />;
  }
  return <WaitingRoomView snapshot={snapshot} isReconnecting={isReconnecting} isGone={isGone} heading={heading} invitation={invitation} />;
}
