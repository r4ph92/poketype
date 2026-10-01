'use client';

import type { ReactNode } from 'react';
import type { RoomSnapshot } from '@/domain/room-view';
import { GoneRoomNotice } from './GoneRoomNotice';
import { RoomRoster } from './RoomRoster';

type WaitingRoomViewProps = { snapshot: RoomSnapshot; isReconnecting: boolean; isGone: boolean; heading: ReactNode; invitation: ReactNode };

export function WaitingRoomView({ snapshot, isReconnecting, isGone, heading, invitation }: WaitingRoomViewProps) {
  return (
    <>
      {!isGone && heading}
      <div aria-live="polite">{isGone ? <GoneRoomNotice /> : <RoomRoster members={snapshot.members} isReconnecting={isReconnecting} />}</div>
      {!isGone && invitation}
    </>
  );
}
