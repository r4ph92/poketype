'use client';

import { useTranslations } from 'next-intl';
import { RoomMemberList } from '@/features/rooms/RoomMemberList';
import type { Racer } from './racers';
import { RacerStatus } from './RacerStatus';

type RaceRosterProps = { racers: Racer[]; passageLength: number; isReconnecting: boolean };

export function RaceRoster({ racers, passageLength, isReconnecting }: RaceRosterProps) {
  const t = useTranslations('Room');
  return (
    <>
      <p className="mt-4 font-bold">{t('playerCount', { count: racers.length })}</p>
      {isReconnecting && <p className="mt-2 font-bold text-error">{t('reconnecting')}</p>}
      <RoomMemberList
        members={racers}
        labels={{ heading: t('playersHeading'), hostBadge: t('hostBadge'), you: t('youMarker') }}
        statusOf={(racer) => <RacerStatus progress={racer.progress} isFinished={racer.isFinished} passageLength={passageLength} />}
      />
    </>
  );
}
