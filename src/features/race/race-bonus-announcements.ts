import { gameConfig } from '@/config/game';
import type { CatchUpBonusKind } from '@/domain/catch-up-bonus';
import type { CatchUpBonusView } from '@/domain/catch-up-bonus-view';

export const bonusLabelKey = { 'remove-words': 'bonusRemoveWords' } as const satisfies Record<CatchUpBonusKind, string>;

// The bonuses the track still announces at this race time, the latest one per racer.
export function announcedBonuses(bonuses: readonly CatchUpBonusView[], raceTimeMs: number | null): ReadonlyMap<string, CatchUpBonusView> {
  if (raceTimeMs === null) return new Map();
  const showing = bonuses.filter(({ awardedMs }) => raceTimeMs >= awardedMs && raceTimeMs < awardedMs + gameConfig.catchUpBonuses.announcementMs);
  return new Map(showing.map((bonus) => [bonus.memberKey, bonus]));
}
