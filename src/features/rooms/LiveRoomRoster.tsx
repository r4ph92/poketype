'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelLink } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { RoomSnapshot } from '@/domain/room-view';
import { RoomMemberList } from './RoomMemberList';
import { useLiveRoom } from './live/use-live-room';

type LiveRoomRosterProps = { initial: RoomSnapshot; invitation: ReactNode };

export function LiveRoomRoster({ initial, invitation }: LiveRoomRosterProps) {
  const { snapshot, connection, isGone } = useLiveRoom(initial);
  return (
    <>
      {!isGone && invitation}
      <div aria-live="polite">
        {isGone ? <GoneRoomNotice /> : <Roster snapshot={snapshot} isReconnecting={connection === 'reconnecting'} />}
      </div>
    </>
  );
}

function Roster({ snapshot, isReconnecting }: { snapshot: RoomSnapshot; isReconnecting: boolean }) {
  const t = useTranslations('Room');
  return (
    <PixelPanel titleId="players-heading" title={t('playersHeading')} meta={t('playerCount', { count: snapshot.members.length })}>
      {isReconnecting && (
        <DialogueBox tone="error">
          <p>{t('reconnecting')}</p>
        </DialogueBox>
      )}
      <RoomMemberList members={snapshot.members} labels={{ hostBadge: t('hostBadge'), you: t('youMarker') }} />
    </PixelPanel>
  );
}

function GoneRoomNotice() {
  const t = useTranslations('Room');
  const pageTitle = useTranslations('Metadata')('roomNotFoundTitle');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = pageTitle;
    headingRef.current?.focus();
  }, [pageTitle]);

  return (
    <PixelPanel titleId="room-gone-title" level={1} title={t('gone')} headingRef={headingRef}>
      <PixelLink href="/play">{t('backToPlay')}</PixelLink>
    </PixelPanel>
  );
}
