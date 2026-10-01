'use client';

import { useTranslations } from 'next-intl';
import { progressPercent } from '@/domain/typing-progress';
import { reachedMilestone, type Racer } from './racers';

// Announces only milestones and finishes, never each keystroke, so a screen reader is not flooded during the race.
export function RaceAnnouncements({ racers, passageLength }: { racers: Racer[]; passageLength: number }) {
  const t = useTranslations('Room');
  const viewer = racers.find((racer) => racer.isViewer);
  const milestone = viewer ? reachedMilestone(progressPercent(viewer.progress.position, passageLength)) : null;
  return (
    <div role="status" className="sr-only">
      {viewer?.isFinished ? <p>{t('finished')}</p> : milestone !== null && <p>{t('yourProgress', { percent: milestone })}</p>}
      {racers
        .filter((racer) => !racer.isViewer && racer.isFinished)
        .map((racer) => (
          <p key={racer.memberKey}>{t('racerFinished', { name: racer.trainerName })}</p>
        ))}
    </div>
  );
}
