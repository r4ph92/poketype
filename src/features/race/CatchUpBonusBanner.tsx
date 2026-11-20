'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { useReservedBottomSpace } from '@/components/pixel/use-reserved-bottom-space';
import type { CatchUpBonusView } from '@/domain/catch-up-bonus-view';
import { useLeaderNotice } from './use-leader-notice';
import { bonusBannerKey, bonusLabelKey, type LeaderBonusView } from './race-bonus-announcements';

type CatchUpBonusBannerProps = { bonus: CatchUpBonusView | undefined; hinderedBy?: LeaderBonusView | undefined };

// Visual only: the race announcements' live region reads the same news to a screen reader. A fixed toast, so it shows at every screen height without moving the passage;
// the page reserves its space while it shows, so a focused control scrolls above it instead of hiding under it (WCAG 2.4.11).
// bonus is the one the viewer received; hinderedBy is a "+3 mots" or "Brouillard" another racer received that hit the viewer, the leader.
export function CatchUpBonusBanner({ bonus, hinderedBy }: CatchUpBonusBannerProps) {
  const t = useTranslations('Room');
  const leaderNotice = useLeaderNotice();
  const toast = useRef<HTMLDivElement>(null);
  const isShown = Boolean(bonus || hinderedBy);
  useReservedBottomSpace(isShown, toast);
  if (!isShown) return null;
  const message = bonus ? t(bonusBannerKey[bonus.kind], { bonus: t(bonusLabelKey[bonus.kind]) }) : leaderNotice(hinderedBy);
  return (
    <div ref={toast} className="bonus-toast" data-bonus-banner={bonus ? bonus.kind : `leader-${hinderedBy?.kind}`}>
      <DialogueBox tone={bonus ? 'success' : 'info'} portrait={false}>
        <p className="font-bold">{message}</p>
      </DialogueBox>
    </div>
  );
}
