'use client';

import { useTranslations } from 'next-intl';
import type { CatchUpBonusView } from '@/domain/catch-up-bonus-view';
import { progressPercent } from '@/domain/typing-progress';
import { bonusLabelKey } from './race-bonus-announcements';
import { reachedMilestone, type Racer } from './racers';

type RaceAnnouncementsProps = { racers: Racer[]; announcedBonuses: ReadonlyMap<string, CatchUpBonusView> };

// Announces only milestones, finishes and catch-up bonuses, never each keystroke, so a screen reader is not flooded during the race.
export function RaceAnnouncements({ racers, announcedBonuses }: RaceAnnouncementsProps) {
  const t = useTranslations('Room');
  const viewer = racers.find((racer) => racer.isViewer);
  const milestone = viewer ? reachedMilestone(progressPercent(viewer.progress.position, viewer.textLength)) : null;
  return (
    <div role="status" className="sr-only">
      {viewer?.isFinished ? <p>{t('finished')}</p> : milestone !== null && <p>{t('yourProgress', { percent: milestone })}</p>}
      {racers
        .filter((racer) => !racer.isViewer && racer.isFinished)
        .map((racer) => (
          <p key={racer.memberKey}>{t('racerFinished', { name: racer.trainerName })}</p>
        ))}
      {racers.flatMap((racer) => {
        const bonus = announcedBonuses.get(racer.memberKey);
        if (!bonus) return [];
        const label = t(bonusLabelKey[bonus.kind]);
        return [<p key={`bonus-${racer.memberKey}`}>{racer.isViewer ? t('bonusBanner', { bonus: label }) : t('bonusReceived', { name: racer.trainerName, bonus: label })}</p>];
      })}
    </div>
  );
}
