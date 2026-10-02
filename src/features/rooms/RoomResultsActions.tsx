'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelLink } from '@/components/pixel/PixelButton';
import { raceResultsPath } from '@/domain/room-id';
import { isViewerHost, type RoomSnapshot } from '@/domain/room-view';
import { ResultsExitLinks } from '@/features/race/ResultsExitLinks';
import { PrepareNextRaceControl } from './PrepareNextRaceControl';

type RoomResultsActionsProps = { snapshot: RoomSnapshot; raceId: string; leave: ReactNode };

// Only the host can bring the room back to the lobby; everyone else waits for them or leaves.
export function RoomResultsActions({ snapshot, raceId, leave }: RoomResultsActionsProps) {
  const t = useTranslations('Room');
  return (
    <>
      {isViewerHost(snapshot) ? (
        <PrepareNextRaceControl roomId={snapshot.roomId} />
      ) : (
        <DialogueBox>
          <p>{t('waitingForHost')}</p>
        </DialogueBox>
      )}
      <ResultsExitLinks />
      <PixelLink href={raceResultsPath(snapshot.roomId, raceId)}>{t('raceResultsLink')}</PixelLink>
      {leave}
    </>
  );
}
