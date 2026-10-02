'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { SubmitButton } from '@/components/pixel/SubmitButton';
import { Toast } from '@/components/pixel/Toast';
import type { LobbyIdle } from '@/domain/lobby-idle';
import type { ServerClock } from '@/domain/server-clock';
import { createRoom } from './create-room';
import { useIsLobbyIdle } from './use-lobby-idle';

type IdleLobbyToastProps = { lobbyIdle: LobbyIdle | null; clock: ServerClock };

// A dismissal holds for this idle period only: after new activity, the next idle period shows the toast again.
export function IdleLobbyToast({ lobbyIdle, clock }: IdleLobbyToastProps) {
  const t = useTranslations('Room');
  const play = useTranslations('Play');
  const isIdle = useIsLobbyIdle(lobbyIdle, clock);
  const [dismissedIdleAt, setDismissedIdleAt] = useState<number | null>(null);
  const idleAt = lobbyIdle?.idleAt ?? null;
  const createRoomForm = (
    <form action={createRoom}>
      <SubmitButton label={play('createRoom')} />
    </form>
  );
  return (
    <Toast
      isOpen={isIdle && idleAt !== dismissedIdleAt}
      message={t('idleMessage')}
      dismissLabel={play('dismissMessage')}
      onDismiss={() => setDismissedIdleAt(idleAt)}
      action={createRoomForm}
    />
  );
}
