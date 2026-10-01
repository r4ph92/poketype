'use client';

import { useTranslations } from 'next-intl';
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
      <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold">
        {t('raceHeading')}
      </h1>
      <RaceCountdown startsAt={race.startsAt} clock={clock} />
      <RacePassage passage={race.passage} heading={t('passageHeading')} />
      <div aria-live="polite">
        <RoomRoster members={members} isReconnecting={isReconnecting} />
      </div>
    </>
  );
}
