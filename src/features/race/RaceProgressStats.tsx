'use client';

import { useTranslations } from 'next-intl';
import type { CountdownStep } from '@/domain/race-countdown';
import { formatRemainingTime } from '@/domain/race-remaining';

type RaceProgressStatsProps = { step: CountdownStep; remainingSeconds: number | null; position: number; passageLength: number };

const statClass = 'font-pixel text-lg font-bold tabular-nums';

// The time left and the viewer's share of the text, read beside the passage they are typing.
export function RaceProgressStats({ step, remainingSeconds, position, passageLength }: RaceProgressStatsProps) {
  const t = useTranslations('Room');
  const percent = Math.floor((position / Math.max(1, passageLength)) * 100);
  return (
    <>
      {step === 'go' && remainingSeconds !== null && <TimeRemaining seconds={remainingSeconds} />}
      <p className={statClass}>{t('yourProgress', { percent })}</p>
    </>
  );
}

// Not a live region and not a second role="timer": announcing every second would drown the typing feedback.
function TimeRemaining({ seconds }: { seconds: number }) {
  const t = useTranslations('Room');
  return (
    <p data-remaining={seconds} className={statClass}>
      {t('timeRemaining', { time: formatRemainingTime(seconds) })}
    </p>
  );
}
