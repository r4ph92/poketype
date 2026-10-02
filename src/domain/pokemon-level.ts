import { gameConfig } from '@/config/game';

const { maxLevel, xpToNextLevel: cost } = gameConfig.progression;

export type PokemonGrowth = { level: number; xp: number };

// null at the maximum level, where XP is no longer stored.
export function xpToNextLevel(level: number): number | null {
  if (level >= maxLevel) return null;
  return cost.base + cost.perLevel * level;
}

// One grant can cross several levels; XP beyond the maximum level is not kept.
export function addXp(growth: PokemonGrowth, gained: number): PokemonGrowth {
  return levelUp({ level: growth.level, xp: growth.xp + gained });
}

function levelUp(growth: PokemonGrowth): PokemonGrowth {
  const nextLevelCost = xpToNextLevel(growth.level);
  if (nextLevelCost === null) return { level: maxLevel, xp: 0 };
  if (growth.xp < nextLevelCost) return growth;
  return levelUp({ level: growth.level + 1, xp: growth.xp - nextLevelCost });
}
