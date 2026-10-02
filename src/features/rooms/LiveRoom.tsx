'use client';

import type { ReactNode } from 'react';
import type { PublicPushConfig } from '@/domain/push-config';
import type { RoomSnapshot } from '@/domain/room-view';
import { RaceResultsView } from '@/features/race/RaceResultsView';
import { RaceStartView } from '@/features/race/RaceStartView';
import { LeaveRoomControl } from './LeaveRoomControl';
import { leaveConfirmationFor } from './leave-confirmation';
import { useLiveRoom } from './live/use-live-room';
import { WaitingRoomView } from './WaitingRoomView';

type LiveRoomProps = { initial: RoomSnapshot; pushConfig: PublicPushConfig | null; heading: ReactNode; invitation: ReactNode };

export function LiveRoom({ initial, pushConfig, heading, invitation }: LiveRoomProps) {
  const { snapshot, connection, clock, leaveToPlay } = useLiveRoom(initial, pushConfig);
  const isReconnecting = connection === 'reconnecting';
  const leave = <LeaveRoomControl roomId={snapshot.roomId} confirmation={leaveConfirmationFor(snapshot)} onLeft={leaveToPlay} />;
  if (snapshot.race?.results) return <RaceResultsView results={snapshot.race.results} members={snapshot.members} leave={leave} />;
  if (snapshot.race) {
    return <RaceStartView key={snapshot.race.id} roomId={snapshot.roomId} race={snapshot.race} clock={clock} members={snapshot.members} isReconnecting={isReconnecting} leave={leave} />;
  }
  return <WaitingRoomView snapshot={snapshot} isReconnecting={isReconnecting} heading={heading} invitation={invitation} leave={leave} />;
}
