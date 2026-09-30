'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { RoomSnapshot } from '@/domain/room-view';
import { RoomMemberList } from './RoomMemberList';
import { useLiveRoom } from './live/use-live-room';

export function LiveRoomRoster({ initial }: { initial: RoomSnapshot }) {
  const { snapshot, connection, isGone } = useLiveRoom(initial);
  return (
    <div aria-live="polite">
      {isGone ? <GoneRoomNotice /> : <Roster snapshot={snapshot} isReconnecting={connection === 'reconnecting'} />}
    </div>
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
      <p className="font-bold">{t('gone')}</p>
      <Link href="/play" className="mt-2 inline-flex min-h-11 items-center underline">
        {t('backToPlay')}
      </Link>
    </div>
  );
}
