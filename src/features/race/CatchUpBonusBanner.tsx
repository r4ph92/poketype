'use client';

import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { gameConfig } from '@/config/game';
import type { CatchUpBonusView } from '@/domain/catch-up-bonus-view';
import { bonusBannerKey, bonusLabelKey } from './race-bonus-announcements';

type CatchUpBonusBannerProps = { bonus: CatchUpBonusView | undefined; lengthenedBy?: CatchUpBonusView | undefined };

// Visual only: the race announcements' live region reads the same news to a screen reader. A fixed toast, so it shows at every screen height without moving the passage.
// bonus is the one the viewer received; lengthenedBy is a "+3 mots" another racer received that grew the viewer's own text.
export function CatchUpBonusBanner({ bonus, lengthenedBy }: CatchUpBonusBannerProps) {
  const t = useTranslations('Room');
  if (!bonus && !lengthenedBy) return null;
  const message = bonus ? t(bonusBannerKey[bonus.kind], { bonus: t(bonusLabelKey[bonus.kind]) }) : t('bonusTextLengthened', { count: gameConfig.catchUpBonuses.addedWords });
  return (
    <div className="bonus-toast" data-bonus-banner={bonus ? bonus.kind : 'lengthened'}>
      <DialogueBox tone="success" portrait={false}>
        <p className="font-bold">{message}</p>
      </DialogueBox>
    </div>
  );
}
