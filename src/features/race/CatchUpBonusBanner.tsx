'use client';

import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import type { CatchUpBonusView } from '@/domain/catch-up-bonus-view';
import { bonusLabelKey } from './race-bonus-announcements';

// Visual only: the race announcements' live region reads the same news to a screen reader. A fixed toast, so it shows at every screen height without moving the passage.
export function CatchUpBonusBanner({ bonus }: { bonus: CatchUpBonusView | undefined }) {
  const t = useTranslations('Room');
  if (!bonus) return null;
  return (
    <div className="bonus-toast" data-bonus-banner={bonus.kind}>
      <DialogueBox tone="success" portrait={false}>
        <p className="font-bold">{t('bonusBanner', { bonus: t(bonusLabelKey[bonus.kind]) })}</p>
      </DialogueBox>
    </div>
  );
}
