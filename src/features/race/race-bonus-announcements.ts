import { gameConfig } from '@/config/game';
import type { CatchUpBonusKind } from '@/domain/catch-up-bonus';
import type { CatchUpBonusView } from '@/domain/catch-up-bonus-view';

export const bonusLabelKey = { 'remove-words': 'bonusRemoveWords', 'add-words': 'bonusAddWords' } as const satisfies Record<CatchUpBonusKind, string>;

// What the receiver's banner adds after the bonus name: their own text got shorter, or the leader's got longer.
export const bonusBannerKey = { 'remove-words': 'bonusBanner', 'add-words': 'bonusBannerAddWords' } as const satisfies Record<CatchUpBonusKind, string>;

// The bonuses the track still announces at this race time, the latest one per racer.
export function announcedBonuses(bonuses: readonly CatchUpBonusView[], raceTimeMs: number | null): ReadonlyMap<string, CatchUpBonusView> {
  return new Map(showingAt(bonuses, raceTimeMs).map((bonus) => [bonus.memberKey, bonus]));
}

// The latest "+3 mots" still announced that lengthened this member's own text, so the leader learns why their text grew (BONUS-03).
export function lengthenedTextBonus(bonuses: readonly CatchUpBonusView[], memberKey: string, raceTimeMs: number | null): CatchUpBonusView | undefined {
  return showingAt(bonuses, raceTimeMs).findLast((bonus) => bonus.kind === 'add-words' && bonus.targetKey === memberKey);
}

function showingAt(bonuses: readonly CatchUpBonusView[], raceTimeMs: number | null): CatchUpBonusView[] {
  if (raceTimeMs === null) return [];
  return bonuses.filter(({ awardedMs }) => raceTimeMs >= awardedMs && raceTimeMs < awardedMs + gameConfig.catchUpBonuses.announcementMs);
}
