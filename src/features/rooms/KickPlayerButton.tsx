'use client';

import { useTranslations } from 'next-intl';
import { ConfirmDialog } from '@/components/pixel/ConfirmDialog';
import type { RoomId } from '@/domain/room-id';
import { requestRemoval } from './request-removal';

type KickPlayerButtonProps = { roomId: RoomId; memberKey: string; name: string };

// The confirmation is the only guard: the server bans the guest for good and checks the host itself. The next snapshot drops the row.
export function KickPlayerButton({ roomId, memberKey, name }: KickPlayerButtonProps) {
  const t = useTranslations('Lobby');
  return (
    <ConfirmDialog
      triggerLabel={t('kickPlayer')}
      triggerAccessibleLabel={t('kickPlayerLabel', { name })}
      title={t('kickTitle', { name })}
      message={t('kickMessage', { name })}
      confirmLabel={t('kickConfirm')}
      cancelLabel={t('kickCancel')}
      pendingLabel={t('kickPending')}
      failureMessage={t('kickFailed')}
      onConfirm={() => requestRemoval(roomId, memberKey)}
    />
  );
}
