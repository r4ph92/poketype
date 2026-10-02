'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ConfirmDialog } from '@/components/pixel/ConfirmDialog';
import { PixelButton } from '@/components/pixel/PixelButton';
import type { RoomId } from '@/domain/room-id';
import type { RoomExit } from './live/use-live-room';
import type { LeaveConfirmation } from './leave-confirmation';
import { postRoomCommand } from './post-room-command';

type LeaveRoomControlProps = { roomId: RoomId; confirmation: LeaveConfirmation | null; exit: RoomExit };

const messageKey = { host: 'leaveHostMessage', race: 'leaveRaceMessage' } as const;

export function LeaveRoomControl({ roomId, confirmation, exit }: LeaveRoomControlProps) {
  const t = useTranslations('Room');

  async function leave(): Promise<boolean> {
    exit.start();
    const left = await postRoomCommand(roomId, 'leave');
    if (left) exit.finish();
    else exit.cancel();
    return left;
  }

  if (confirmation) {
    return (
      <ConfirmDialog
        triggerLabel={t('leaveRoom')}
        title={t('leaveTitle')}
        message={t(messageKey[confirmation])}
        confirmLabel={t('confirmLeave')}
        cancelLabel={t('cancelAction')}
        pendingLabel={t('leaving')}
        failureMessage={t('leaveFailed')}
        onConfirm={leave}
      />
    );
  }
  return <LeaveWithoutConfirmation leave={leave} />;
}

// After a success the page navigates away, so the button stays pending until then.
function LeaveWithoutConfirmation({ leave }: { leave: () => Promise<boolean> }) {
  const t = useTranslations('Room');
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  async function run(): Promise<void> {
    setPending(true);
    setFailed(false);
    const left = await leave();
    if (!left) setPending(false);
    setFailed(!left);
  }

  return (
    <div className="grid gap-2">
      <PixelButton variant="secondary" pending={pending} onClick={() => void run()}>{t('leaveRoom')}</PixelButton>
      {failed && <p role="alert" className="font-bold text-error">{t('leaveFailed')}</p>}
    </div>
  );
}
