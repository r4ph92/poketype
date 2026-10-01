'use client';

import { useTranslations } from 'next-intl';
import type { RoomMemberView } from '@/domain/room-view';
import { RoomMemberList } from './RoomMemberList';

export function RoomRoster({ members, isReconnecting }: { members: RoomMemberView[]; isReconnecting: boolean }) {
  const t = useTranslations('Room');
  return (
    <>
      <p className="mt-4 font-bold">{t('playerCount', { count: members.length })}</p>
      {isReconnecting && <p className="mt-2 font-bold text-error">{t('reconnecting')}</p>}
      <RoomMemberList members={members} labels={{ heading: t('playersHeading'), hostBadge: t('hostBadge'), you: t('youMarker') }} />
    </>
  );
}
