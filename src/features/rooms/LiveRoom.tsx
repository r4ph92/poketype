'use client';

import { useState, type ReactNode } from 'react';
import type { PublicPushConfig } from '@/domain/push-config';
import type { RoomSnapshot } from '@/domain/room-view';
import { RaceResultsView } from '@/features/race/RaceResultsView';
import { RaceStartView } from '@/features/race/RaceStartView';
import { LeaveRoomControl } from './LeaveRoomControl';
import { RoomResultsActions } from './RoomResultsActions';
import { leaveConfirmationFor } from './leave-confirmation';
import { useLiveRoom } from './live/use-live-room';
import { WaitingRoomView } from './WaitingRoomView';

type LiveRoomProps = { initial: RoomSnapshot; pushConfig: PublicPushConfig | null; heading: ReactNode };

export function LiveRoom({ initial, pushConfig, heading }: LiveRoomProps) {
  const { snapshot, connection, clock, exit } = useLiveRoom(initial, pushConfig);
  const [settledAtLoad] = useState(initial.race?.results ? initial.race.id : null);
  const isReconnecting = connection === 'reconnecting';
  const leave = <LeaveRoomControl roomId={snapshot.roomId} confirmation={leaveConfirmationFor(snapshot)} exit={exit} />;
  if (snapshot.race?.results) {
    const actions = <RoomResultsActions snapshot={snapshot} raceId={snapshot.race.id} leave={leave} />;
    const celebrate = snapshot.race.id !== settledAtLoad;
    return <RaceResultsView results={snapshot.race.results} racers={snapshot.members} reward={snapshot.race.reward} celebrate={celebrate} actions={actions} />;
  }
  if (snapshot.race) {
    return <RaceStartView key={snapshot.race.id} roomId={snapshot.roomId} race={snapshot.race} clock={clock} members={snapshot.members} isReconnecting={isReconnecting} leave={leave} />;
  }
  return <WaitingRoomView snapshot={snapshot} clock={clock} isReconnecting={isReconnecting} heading={heading} leave={leave} />;
}
