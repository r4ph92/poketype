'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { formatFinishSeconds } from './race-number-format';

// A racer the time limit stopped has no finish time; the row still shows what they typed.
export function ResultTime({ finishMs }: { finishMs: number | null }) {
  const t = useTranslations('Room');
  const format = useFormatter();
  if (finishMs === null) return t('unfinished');
  return t('finishTime', { seconds: formatFinishSeconds(format, finishMs) });
}
