'use client';

import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { RoomMemberView } from '@/domain/room-view';
import { RoomMemberList, type MemberStatus } from './RoomMemberList';

type RoomRosterProps<Member extends RoomMemberView> = { members: Member[]; isReconnecting: boolean; statusOf?: MemberStatus<Member> };

export function RoomRoster<Member extends RoomMemberView>({ members, isReconnecting, statusOf }: RoomRosterProps<Member>) {
  const t = useTranslations('Room');
  const bots = useTranslations('Bots');
  return (
    <PixelPanel titleId="players-heading" title={t('playersHeading')} meta={t('playerCount', { count: members.length })}>
      {isReconnecting && (
        <DialogueBox tone="error">
          <p>{t('reconnecting')}</p>
        </DialogueBox>
      )}
      <RoomMemberList members={members} labels={{ hostBadge: t('hostBadge'), you: t('youMarker'), bot: bots('botTag') }} statusOf={statusOf} />
    </PixelPanel>
  );
}
