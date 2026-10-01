'use client';

import { RoomRoster } from '@/features/rooms/RoomRoster';
import type { Racer } from './racers';
import { RacerStatus } from './RacerStatus';

type RaceRosterProps = { racers: Racer[]; passageLength: number; isReconnecting: boolean };

export function RaceRoster({ racers, passageLength, isReconnecting }: RaceRosterProps) {
  return (
    <RoomRoster
      members={racers}
      isReconnecting={isReconnecting}
      statusOf={(racer) => <RacerStatus progress={racer.progress} isFinished={racer.isFinished} passageLength={passageLength} />}
    />
  );
}
