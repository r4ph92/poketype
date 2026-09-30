'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type { RoomSnapshot } from '@/domain/room-view';
import { RoomMemberList } from './RoomMemberList';
import { useLiveRoom } from './live/use-live-room';

type LiveRoomRosterProps = { initial: RoomSnapshot; heading: ReactNode; invitation: ReactNode };

export function LiveRoomRoster({ initial, heading, invitation }: LiveRoomRosterProps) {
  const { snapshot, connection, isGone } = useLiveRoom(initial);
  if (isGone) return <GoneRoomNotice />;
  return (
    <>
      {heading}
      <div aria-live="polite">
        <Roster snapshot={snapshot} isReconnecting={connection === 'reconnecting'} />
      </div>
      {invitation}
    </>
  );
}

function Roster({ snapshot, isReconnecting }: { snapshot: RoomSnapshot; isReconnecting: boolean }) {
  const t = useTranslations('Room');
  return (
    <>
      <p className="mt-4 font-bold">{t('playerCount', { count: snapshot.members.length })}</p>
      {isReconnecting && <p className="mt-2 font-bold text-error">{t('reconnecting')}</p>}
      <RoomMemberList
        members={snapshot.members}
        labels={{ heading: t('playersHeading'), hostBadge: t('hostBadge'), you: t('youMarker') }}
      />
    </>
  );
}

function GoneRoomNotice() {
  const t = useTranslations('Room');
  return (
    <div className="mt-6 border-4 border-ink bg-white p-4">
      <h1 className="text-xl font-bold">{t('gone')}</h1>
      <Link href="/play" className="mt-2 inline-flex min-h-11 items-center underline">
        {t('backToPlay')}
      </Link>
    </div>
  );
}
