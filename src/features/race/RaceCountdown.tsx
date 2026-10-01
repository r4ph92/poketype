'use client';

import { useTranslations } from 'next-intl';
import type { CountdownStep } from '@/domain/race-countdown';
import type { ServerClock } from '@/domain/server-clock';
import { useRaceCountdown } from './use-race-countdown';

export function RaceCountdown({ startsAt, clock }: { startsAt: number; clock: ServerClock }) {
  const text = useCountdownText(useRaceCountdown(startsAt, clock));
  return (
    <p role="timer" aria-live="polite" aria-atomic="true" className="mt-6 border-4 border-ink bg-white p-4 text-center text-4xl font-bold whitespace-nowrap">
      {text}
    </p>
  );
}

function useCountdownText(step: CountdownStep): string {
  const t = useTranslations('Room');
  if (step === 'get-ready') return t('getReady');
  if (step === 'go') return t('go');
  return t('countdownSecond', { seconds: step });
}
