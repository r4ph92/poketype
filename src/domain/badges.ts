import { gameConfig } from '@/config/game';

export type BadgeId = (typeof gameConfig.badges)[number]['id'];

export const badgeIds: readonly BadgeId[] = gameConfig.badges.map((badge) => badge.id);

export function isBadgeId(value: unknown): value is BadgeId {
  return typeof value === 'string' && (badgeIds as readonly string[]).includes(value);
}

export function badgesEarnedAfter(finishedRaces: number): BadgeId[] {
  return gameConfig.badges.filter((badge) => finishedRaces >= badge.finishedRaces).map((badge) => badge.id);
}
