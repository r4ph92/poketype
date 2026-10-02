import { gameConfig } from '@/config/game';

const { maxLevel, xpToNextLevel: cost } = gameConfig.progression;

// null at the maximum level, where XP is no longer stored.
export function xpToNextLevel(level: number): number | null {
  if (level >= maxLevel) return null;
  return cost.base + cost.perLevel * level;
}
