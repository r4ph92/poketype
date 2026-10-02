import type { PokemonSpecies } from '@/assets/pokemon';
import { xpToNextLevel, type PokemonGrowth } from '@/domain/pokemon-level';
import { hasEvolved, type XpReward } from '@/domain/xp-reward';

// evolving shows the old form flashing white; evolved shows the new form arriving.
export type EvolutionStage = 'none' | 'evolving' | 'evolved';

// One still of the reward reveal. fills tells the bar to slide to ratio rather than jump; reachedLevel is the last "Level N!" shown so far.
export type XpRewardFrame = {
  species: PokemonSpecies;
  level: number;
  ratio: number;
  fills: boolean;
  reachedLevel: number | null;
  evolution: EvolutionStage;
  durationMs: number;
};

export const xpRevealTimings = { pauseMs: 400, fillMs: 900, levelUpMs: 900, resetMs: 50, evolvingMs: 1600 } as const;

// The last frame is the final state, shown at once on a refresh or under reduced motion.
export function xpRewardFrames(reward: XpReward): XpRewardFrame[] {
  const start: XpRewardFrame = { species: reward.before.species, level: reward.before.level, ratio: barRatio(reward.before), fills: false, reachedLevel: null, evolution: 'none', durationMs: xpRevealTimings.pauseMs };
  const filled = fillFrames(start, reward.after);
  return [start, ...filled, ...evolutionFrames(filled.at(-1) ?? start, reward)];
}

function fillFrames(from: XpRewardFrame, target: PokemonGrowth): XpRewardFrame[] {
  if (from.level >= target.level) return [{ ...from, ratio: barRatio(target), fills: true, durationMs: xpRevealTimings.fillMs }];
  const nextLevel = from.level + 1;
  const full: XpRewardFrame = { ...from, ratio: 1, fills: true, durationMs: xpRevealTimings.fillMs };
  const levelUp: XpRewardFrame = { ...full, level: nextLevel, reachedLevel: nextLevel, fills: false, durationMs: xpRevealTimings.levelUpMs };
  const emptied: XpRewardFrame = { ...levelUp, ratio: barRatio({ level: nextLevel, xp: 0 }), durationMs: xpRevealTimings.resetMs };
  return [full, levelUp, emptied, ...fillFrames(emptied, target)];
}

function evolutionFrames(last: XpRewardFrame, reward: XpReward): XpRewardFrame[] {
  if (!hasEvolved(reward)) return [];
  const evolving: XpRewardFrame = { ...last, fills: false, evolution: 'evolving', durationMs: xpRevealTimings.evolvingMs };
  return [evolving, { ...evolving, species: reward.after.species, evolution: 'evolved', durationMs: 0 }];
}

// A Pokémon at the maximum level shows a full bar.
export function barRatio({ level, xp }: PokemonGrowth): number {
  const nextLevelCost = xpToNextLevel(level);
  return nextLevelCost === null ? 1 : Math.min(1, xp / nextLevelCost);
}
