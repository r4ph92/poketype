'use client';

import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { RoomMemberView } from '@/domain/room-view';
import { RoomMemberList } from './RoomMemberList';

export function RoomRoster({ members, isReconnecting }: { members: RoomMemberView[]; isReconnecting: boolean }) {
  const t = useTranslations('Room');
  return (
    <PixelPanel titleId="players-heading" title={t('playersHeading')} meta={t('playerCount', { count: members.length })}>
      {isReconnecting && (
        <DialogueBox tone="error">
          <p>{t('reconnecting')}</p>
        </DialogueBox>
      )}
      <RoomMemberList members={members} labels={{ hostBadge: t('hostBadge'), you: t('youMarker') }} />
    </PixelPanel>
  );
}
