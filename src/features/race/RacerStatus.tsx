'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { ProgressBadge } from '@/components/pixel/ProgressBadge';
import { progressPercent } from '@/domain/typing-progress';
import type { RacerProgress } from '@/domain/room-view';
import { formatFinishSeconds } from './race-number-format';

type RacerStatusProps = { progress: RacerProgress; isFinished: boolean; passageLength: number };

// Text inherits the row color: green on the viewer's gold row would fall under 4.5:1, so "finished" is a framed badge instead.
export function RacerStatus({ progress, isFinished, passageLength }: RacerStatusProps) {
  const t = useTranslations('Room');
  const format = useFormatter();
  if (!isFinished) return <span className="font-bold">{t('progressPercent', { percent: progressPercent(progress.position, passageLength) })}</span>;
  const seconds = progress.finishMs === null ? null : formatFinishSeconds(format, progress.finishMs);
  return (
    <>
      <ProgressBadge variant="ready">{t('finished')}</ProgressBadge>
      {seconds !== null && <span className="font-bold">{t('finishTime', { seconds })}</span>}
    </>
  );
}
