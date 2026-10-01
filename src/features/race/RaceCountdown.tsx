'use client';

import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import type { CountdownStep } from '@/domain/race-countdown';

export function RaceCountdown({ step }: { step: CountdownStep }) {
  const text = useCountdownText(step);
  return (
    <DialogueBox>
      <p role="timer" aria-live="polite" aria-atomic="true" className="font-pixel text-display font-bold whitespace-nowrap">
        {text}
      </p>
    </DialogueBox>
  );
}

function useCountdownText(step: CountdownStep): string {
  const t = useTranslations('Room');
  if (step === 'get-ready') return t('getReady');
  if (step === 'go') return t('go');
  return t('countdownSecond', { seconds: step });
}
