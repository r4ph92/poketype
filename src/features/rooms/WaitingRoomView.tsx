'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { isViewerHost, type RoomSnapshot } from '@/domain/room-view';
import { GoneRoomNotice } from './GoneRoomNotice';
import { RoomRoster } from './RoomRoster';
import { StartRaceControl } from './StartRaceControl';

type WaitingRoomViewProps = { snapshot: RoomSnapshot; isReconnecting: boolean; isGone: boolean; heading: ReactNode; invitation: ReactNode };

export function WaitingRoomView({ snapshot, isReconnecting, isGone, heading, invitation }: WaitingRoomViewProps) {
  return (
    <>
      {!isGone && (
        <PixelPanel titleId="room-title" level={1} title={heading}>
          <RaceStartArea snapshot={snapshot} />
          {invitation}
        </PixelPanel>
      )}
      <div aria-live="polite">{isGone ? <GoneRoomNotice /> : <RoomRoster members={snapshot.members} isReconnecting={isReconnecting} />}</div>
    </>
  );
}

function RaceStartArea({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = useTranslations('Room');
  if (isViewerHost(snapshot)) return <StartRaceControl roomId={snapshot.roomId} playerCount={snapshot.members.length} />;
  return (
    <DialogueBox>
      <p>{t('hostWillStart')}</p>
    </DialogueBox>
  );
}
