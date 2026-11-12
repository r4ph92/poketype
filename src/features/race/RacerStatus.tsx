'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { ProgressBadge } from '@/components/pixel/ProgressBadge';
import { progressPercent } from '@/domain/typing-progress';
import type { RacerProgress } from '@/domain/room-view';
import { formatFinishSeconds } from './race-number-format';

type RacerStatusProps = { progress: RacerProgress; isFinished: boolean; isAbandoned: boolean; isInactive: boolean; passageLength: number };

// Text inherits the row color: green on the viewer's gold row would fall under 4.5:1, so "finished" is a framed badge instead.
// A racer the server has not heard from for a few seconds keeps their progress, with a "Déconnexion" badge until they come back (COURSE-08).
export function RacerStatus({ progress, isFinished, isAbandoned, isInactive, passageLength }: RacerStatusProps) {
  const t = useTranslations('Room');
  const format = useFormatter();
  if (isAbandoned) return <ProgressBadge>{t('abandoned')}</ProgressBadge>;
  if (isInactive) return <ProgressBadge>{t('inactive')}</ProgressBadge>;
  const percent = <span className="font-bold">{t('progressPercent', { percent: progressPercent(progress.position, passageLength) })}</span>;
  if (!isFinished && progress.disconnected) return <><ProgressBadge>{t('disconnected')}</ProgressBadge>{percent}</>;
  if (!isFinished) return percent;
  const seconds = progress.finishMs === null ? null : formatFinishSeconds(format, progress.finishMs);
  return (
    <>
      <ProgressBadge variant="ready">{t('finished')}</ProgressBadge>
      {seconds !== null && <span className="font-bold">{t('finishTime', { seconds })}</span>}
    </>
  );
}
