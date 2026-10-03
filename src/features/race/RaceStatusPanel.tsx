'use client';

import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { CountdownStep } from '@/domain/race-countdown';
import { RaceCountdown } from './RaceCountdown';

export function RaceStatusPanel({ step }: { step: CountdownStep }) {
  const t = useTranslations('Room');
  return (
    <PixelPanel titleId="race-status" title={t('raceStatus')} variant="compact">
      <RaceCountdown step={step} />
    </PixelPanel>
  );
}
