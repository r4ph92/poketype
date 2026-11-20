'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { useReservedBottomSpace } from '@/components/pixel/use-reserved-bottom-space';
import { gameConfig } from '@/config/game';
import type { CatchUpBonusView } from '@/domain/catch-up-bonus-view';
import { bonusBannerKey, bonusLabelKey } from './race-bonus-announcements';

type CatchUpBonusBannerProps = { bonus: CatchUpBonusView | undefined; lengthenedBy?: CatchUpBonusView | undefined };

// Visual only: the race announcements' live region reads the same news to a screen reader. A fixed toast, so it shows at every screen height without moving the passage;
// the page reserves its space while it shows, so a focused control scrolls above it instead of hiding under it (WCAG 2.4.11).
// bonus is the one the viewer received; lengthenedBy is a "+3 mots" another racer received that grew the viewer's own text.
export function CatchUpBonusBanner({ bonus, lengthenedBy }: CatchUpBonusBannerProps) {
  const t = useTranslations('Room');
  const toast = useRef<HTMLDivElement>(null);
  const isShown = Boolean(bonus || lengthenedBy);
  useReservedBottomSpace(isShown, toast);
  if (!isShown) return null;
  const message = bonus ? t(bonusBannerKey[bonus.kind], { bonus: t(bonusLabelKey[bonus.kind]) }) : t('bonusTextLengthened', { count: gameConfig.catchUpBonuses.addedWords });
  return (
    <div ref={toast} className="bonus-toast" data-bonus-banner={bonus ? bonus.kind : 'lengthened'}>
      <DialogueBox tone="success" portrait={false}>
        <p className="font-bold">{message}</p>
      </DialogueBox>
    </div>
  );
}
