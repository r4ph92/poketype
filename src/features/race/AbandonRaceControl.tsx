'use client';

import { useTranslations } from 'next-intl';
import { ConfirmDialog } from '@/components/pixel/ConfirmDialog';
import type { RoomId } from '@/domain/room-id';
import { postRoomCommand } from '@/features/rooms/post-room-command';

type AbandonRaceControlProps = { roomId: RoomId; onAbandoned: () => void };

export function AbandonRaceControl({ roomId, onAbandoned }: AbandonRaceControlProps) {
  const t = useTranslations('Room');

  async function abandon(): Promise<boolean> {
    const abandoned = await postRoomCommand(roomId, 'abandon');
    if (abandoned) onAbandoned();
    return abandoned;
  }

  return (
    <ConfirmDialog
      triggerLabel={t('abandonRace')}
      title={t('abandonTitle')}
      message={t('abandonMessage')}
      confirmLabel={t('confirmAbandon')}
      cancelLabel={t('cancelAction')}
      pendingLabel={t('leaving')}
      failureMessage={t('abandonFailed')}
      onConfirm={abandon}
    />
  );
}
