'use client';

import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { RaceView, RoomMemberView } from '@/domain/room-view';
import type { ServerClock } from '@/domain/server-clock';
import { RoomRoster } from '@/features/rooms/RoomRoster';
import { useFocusedHeading } from '@/features/rooms/use-focused-heading';
import { RaceCountdown } from './RaceCountdown';
import { RacePassage } from './RacePassage';

type RaceStartViewProps = { race: RaceView; clock: ServerClock; members: RoomMemberView[]; isReconnecting: boolean };

export function RaceStartView({ race, clock, members, isReconnecting }: RaceStartViewProps) {
  const t = useTranslations('Room');
  const headingRef = useFocusedHeading(useTranslations('Metadata')('raceTitle'));
  return (
    <>
      <PixelPanel titleId="race-title" level={1} title={t('raceHeading')} headingRef={headingRef}>
        <RaceCountdown startsAt={race.startsAt} clock={clock} />
      </PixelPanel>
      <RacePassage passage={race.passage} heading={t('passageHeading')} />
      <div aria-live="polite">
        <RoomRoster members={members} isReconnecting={isReconnecting} />
      </div>
    </>
  );
}
