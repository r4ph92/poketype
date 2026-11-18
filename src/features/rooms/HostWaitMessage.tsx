'use client';

import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';

type HostWaitMessageProps = { isHostAway: boolean; waitingMessage: string };

// What the other members read while the host decides; the live region stays mounted so the host dropping out and coming back are both announced.
export function HostWaitMessage({ isHostAway, waitingMessage }: HostWaitMessageProps) {
  const t = useTranslations('Room');
  return (
    <DialogueBox tone={isHostAway ? 'error' : 'info'}>
      <p role="status">{isHostAway ? t('hostAway') : waitingMessage}</p>
    </DialogueBox>
  );
}
