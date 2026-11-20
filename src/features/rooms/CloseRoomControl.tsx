'use client';

import { useTranslations } from 'next-intl';
import { ConfirmDialog } from '@/components/pixel/ConfirmDialog';
import type { RoomId } from '@/domain/room-id';
import type { RoomExit } from './live/use-live-room';
import { postRoomCommand } from './post-room-command';

type CloseRoomControlProps = { roomId: RoomId; exit: RoomExit };

// The closing host goes home without the notice the others get, so her own page stops listening before the request.
export function CloseRoomControl({ roomId, exit }: CloseRoomControlProps) {
  const t = useTranslations('Room');

  async function close(): Promise<boolean> {
    exit.start();
    const closed = await postRoomCommand(roomId, 'close');
    if (closed) exit.finish();
    else exit.cancel();
    return closed;
  }

  return (
    <ConfirmDialog
      triggerLabel={t('closeRoom')}
      title={t('closeTitle')}
      message={t('closeMessage')}
      confirmLabel={t('confirmClose')}
      cancelLabel={t('cancelAction')}
      pendingLabel={t('closing')}
      failureMessage={t('closeFailed')}
      onConfirm={close}
    />
  );
}
