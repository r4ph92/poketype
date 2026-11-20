'use client';

import { useTranslations } from 'next-intl';
import { gameConfig } from '@/config/game';
import type { LeaderBonusView } from './race-bonus-announcements';

const { addedWords, fogMs } = gameConfig.catchUpBonuses;

// What the leader reads when another racer's bonus hit them: their text grew, or their next words blur for a few seconds.
export function useLeaderNotice(): (bonus: LeaderBonusView | undefined) => string {
  const t = useTranslations('Room');
  return (bonus) => {
    if (bonus === undefined) return '';
    return bonus.kind === 'fog' ? t('bonusFogged', { seconds: fogMs / 1000 }) : t('bonusTextLengthened', { count: addedWords });
  };
}
