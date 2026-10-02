'use client';

import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { CountdownStep } from '@/domain/race-countdown';
import { formatRemainingTime } from '@/domain/race-remaining';
import { RaceCountdown } from './RaceCountdown';

type RaceStatusPanelProps = { step: CountdownStep; remainingSeconds: number | null; position: number; passageLength: number };

export function RaceStatusPanel({ step, remainingSeconds, position, passageLength }: RaceStatusPanelProps) {
  const t = useTranslations('Room');
  const ratio = position / Math.max(1, passageLength);
  return (
    <PixelPanel titleId="race-status" title={t('raceStatus')}>
      <RaceCountdown step={step} />
      {step === 'go' && remainingSeconds !== null && <TimeRemaining seconds={remainingSeconds} />}
      <p className="font-pixel text-xl">{t('yourProgress', { percent: Math.floor(ratio * 100) })}</p>
      <div className="h-4 border-2 border-frame bg-cream-deep" aria-hidden="true"><div className="h-full bg-success" style={{ width: `${ratio * 100}%` }} /></div>
    </PixelPanel>
  );
}

// Not a live region and not a second role="timer": announcing every second would drown the typing feedback.
function TimeRemaining({ seconds }: { seconds: number }) {
  const t = useTranslations('Room');
  return (
    <p data-remaining={seconds} className="font-pixel text-xl font-bold tabular-nums">
      {t('timeRemaining', { time: formatRemainingTime(seconds) })}
    </p>
  );
}
