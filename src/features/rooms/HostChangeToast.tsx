'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Toast } from '@/components/pixel/Toast';
import type { RoomMemberView } from '@/domain/room-view';

type HostChangeToastProps = { members: readonly RoomMemberView[] };

// The notice compares with the host this page first showed, so every member sees it whichever snapshot brought the change.
export function HostChangeToast({ members }: HostChangeToastProps) {
  const t = useTranslations('Room');
  const play = useTranslations('Play');
  const host = members.find((member) => member.isHost) ?? null;
  const hostKey = host?.memberKey ?? null;
  const [firstHostKey] = useState(hostKey);
  const [dismissedHostKey, setDismissedHostKey] = useState<string | null>(null);
  const isNewHost = host !== null && hostKey !== firstHostKey && hostKey !== dismissedHostKey;
  return (
    <Toast
      isOpen={isNewHost}
      message={host ? t('hostChanged', { name: host.trainerName }) : ''}
      dismissLabel={play('dismissMessage')}
      onDismiss={() => setDismissedHostKey(hostKey)}
    />
  );
}
