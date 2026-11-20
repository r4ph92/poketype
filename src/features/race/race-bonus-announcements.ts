import { gameConfig } from '@/config/game';
import type { CatchUpBonusKind } from '@/domain/catch-up-bonus';
import type { CatchUpBonusView } from '@/domain/catch-up-bonus-view';

export const bonusLabelKey = { 'remove-words': 'bonusRemoveWords', 'add-words': 'bonusAddWords', fog: 'bonusFog' } as const satisfies Record<CatchUpBonusKind, string>;

// What the receiver's banner adds after the bonus name: their own text got shorter, the leader's got longer, or the leader's next words blur.
export const bonusBannerKey = { 'remove-words': 'bonusBanner', 'add-words': 'bonusBannerAddWords', fog: 'bonusBannerFog' } as const satisfies Record<CatchUpBonusKind, string>;

export type LeaderBonusView = Extract<CatchUpBonusView, { kind: 'add-words' | 'fog' }>;

const { announcementMs, fogMs } = gameConfig.catchUpBonuses;

// The bonuses the track still announces at this race time, the latest one per receiver.
export function announcedBonuses(bonuses: readonly CatchUpBonusView[], raceTimeMs: number | null): ReadonlyMap<string, CatchUpBonusView> {
  return new Map(showingAt(bonuses, raceTimeMs, announcementMs).map((bonus) => [bonus.memberKey, bonus]));
}

// The badge on each roster line: a bonus sits on its receiver's line, except "Brouillard", which sits on the line of the leader it blurs (BONUS-03).
export function trackBadges(bonuses: readonly CatchUpBonusView[], raceTimeMs: number | null): ReadonlyMap<string, CatchUpBonusView> {
  return new Map(showingAt(bonuses, raceTimeMs, announcementMs).flatMap((bonus) => badgeLineOf(bonus).map((line) => [line, bonus] as const)));
}

function badgeLineOf(bonus: CatchUpBonusView): string[] {
  if (bonus.kind !== 'fog') return [bonus.memberKey];
  return bonus.targetKey === null ? [] : [bonus.targetKey];
}

// The latest "+3 mots" or "Brouillard" still hindering this member, so the leader learns why their text grew or blurred (BONUS-03).
// A fog notice lasts as long as the fog, so it never outlives the blur it explains.
export function leaderNoticeBonus(bonuses: readonly CatchUpBonusView[], memberKey: string, raceTimeMs: number | null): LeaderBonusView | undefined {
  return bonuses.filter((bonus) => isLeaderBonusOf(bonus, memberKey)).filter((bonus) => isWithin(bonus, raceTimeMs, noticeMsOf(bonus))).at(-1);
}

// The fog blurring this member's next words now, on the server clock, from its award for the configured time.
export function foggingBonus(bonuses: readonly CatchUpBonusView[], memberKey: string, raceTimeMs: number | null): LeaderBonusView | undefined {
  return bonuses.filter((bonus) => isLeaderBonusOf(bonus, memberKey)).find((bonus) => bonus.kind === 'fog' && isWithin(bonus, raceTimeMs, fogMs));
}

function isLeaderBonusOf(bonus: CatchUpBonusView, memberKey: string): bonus is LeaderBonusView {
  return bonus.kind !== 'remove-words' && bonus.targetKey === memberKey;
}

function noticeMsOf(bonus: LeaderBonusView): number {
  return bonus.kind === 'fog' ? fogMs : announcementMs;
}

function showingAt(bonuses: readonly CatchUpBonusView[], raceTimeMs: number | null, durationMs: number): CatchUpBonusView[] {
  return bonuses.filter((bonus) => isWithin(bonus, raceTimeMs, durationMs));
}

function isWithin({ awardedMs }: CatchUpBonusView, raceTimeMs: number | null, durationMs: number): boolean {
  return raceTimeMs !== null && raceTimeMs >= awardedMs && raceTimeMs < awardedMs + durationMs;
}
