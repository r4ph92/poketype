'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { progressPercent } from '@/domain/typing-progress';
import type { RacerProgress } from '@/domain/room-view';
import { formatFinishSeconds } from './race-number-format';

type RacerStatusProps = { progress: RacerProgress; isFinished: boolean; passageLength: number };

export function RacerStatus({ progress, isFinished, passageLength }: RacerStatusProps) {
  const t = useTranslations('Room');
  const format = useFormatter();
  if (!isFinished) return <span className="ml-auto font-mono font-bold">{t('progressPercent', { percent: progressPercent(progress.position, passageLength) })}</span>;
  const seconds = progress.finishMs === null ? null : formatFinishSeconds(format, progress.finishMs);
  return (
    <span className="ml-auto flex gap-2 font-mono font-bold">
      <span className="text-success">{t('finished')}</span>
      {seconds !== null && <span>{t('finishTime', { seconds })}</span>}
    </span>
  );
}
