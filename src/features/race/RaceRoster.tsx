'use client';

import { useTranslations } from 'next-intl';
import type { RoomId } from '@/domain/room-id';
import { RemovePlayerButton } from '@/features/rooms/RemovePlayerButton';
import { RoomRoster } from '@/features/rooms/RoomRoster';
import type { Racer } from './racers';
import { RacerStatus } from './RacerStatus';

type RaceRosterProps = { roomId: RoomId; racers: Racer[]; passageLength: number; isReconnecting: boolean; removableKeys: ReadonlySet<string> };

// The host sees "Retirer" only next to a racer who has typed nothing for a minute; the server checks the same rule.
export function RaceRoster({ roomId, racers, passageLength, isReconnecting, removableKeys }: RaceRosterProps) {
  const t = useTranslations('Room');
  return (
    <RoomRoster
      members={racers}
      isReconnecting={isReconnecting}
      statusOf={(racer) => (
        <>
          <RacerStatus progress={racer.progress} isFinished={racer.isFinished} isAbandoned={racer.isAbandoned} isInactive={racer.isInactive} passageLength={passageLength} />
          {removableKeys.has(racer.memberKey) && (
            <RemovePlayerButton
              roomId={roomId}
              memberKey={racer.memberKey}
              label={t('removeInactive')}
              accessibleLabel={t('removeInactiveLabel', { name: racer.trainerName })}
              failureMessage={t('removeFailed')}
            />
          )}
        </>
      )}
    />
  );
}
