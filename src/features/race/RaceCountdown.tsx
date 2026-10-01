'use client';

import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import type { CountdownStep } from '@/domain/race-countdown';
import type { ServerClock } from '@/domain/server-clock';
import { useRaceCountdown } from './use-race-countdown';

export function RaceCountdown({ startsAt, clock }: { startsAt: number; clock: ServerClock }) {
  const text = useCountdownText(useRaceCountdown(startsAt, clock));
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
