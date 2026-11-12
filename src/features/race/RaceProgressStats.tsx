'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { CountdownStep } from '@/domain/race-countdown';
import { measureRacer } from '@/domain/race-results';
import { formatRemainingTime } from '@/domain/race-remaining';
import type { TypingCounters } from '@/domain/typing-progress';
import { accuracyPercent, formatWholeNumber } from './race-number-format';

type RaceProgressStatsProps = { step: CountdownStep; remainingSeconds: number | null; counters: TypingCounters; elapsedMs: number | null; passageLength: number };

const statClass = 'font-pixel text-lg font-bold tabular-nums';

// The time left, the viewer's share of the text and their live WPM and accuracy (COURSE-04), read beside the passage they are typing.
export function RaceProgressStats({ step, remainingSeconds, counters, elapsedMs, passageLength }: RaceProgressStatsProps) {
  const t = useTranslations('Room');
  const percent = Math.floor((counters.position / Math.max(1, passageLength)) * 100);
  return (
    <>
      {step === 'go' && remainingSeconds !== null && <TimeRemaining seconds={remainingSeconds} />}
      <p className={statClass}>{t('yourProgress', { percent })}</p>
      {step === 'go' && elapsedMs !== null && <LiveMetrics counters={counters} elapsedMs={elapsedMs} />}
    </>
  );
}

// The same Annex A formulas as the results, from the local counters; at the finish they match the results exactly.
function LiveMetrics({ counters, elapsedMs }: { counters: TypingCounters; elapsedMs: number }) {
  const t = useTranslations('Room');
  const format = useFormatter();
  const { position, keystrokes, rejectedKeystrokes } = counters;
  const { grossWpm, accuracy } = measureRacer({ typedCharacters: position, keystrokes, rejectedKeystrokes, elapsedMs: Math.max(0, elapsedMs) });
  return (
    <>
      <p className={statClass}>{t('liveWpm', { value: formatWholeNumber(format, grossWpm) })}</p>
      {keystrokes > 0 && <p className={statClass}>{t('liveAccuracy', { percent: accuracyPercent(format, accuracy) })}</p>}
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
