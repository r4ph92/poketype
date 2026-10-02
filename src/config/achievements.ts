// Tunable legendary goals: meeting every requirement of one grants that legendary once, checked after each race settlement (docs/PROGRESSION.md).
export type AchievementMetrics = { finishedRaces: number; wins: number; accurateRaces: number; speciesOwned: number; badgesEarned: number };
export type Requirement = { metric: keyof AchievementMetrics; target: number };
export const legendaryRewards = [
  { id: 'articuno', dex: 144, badge: 'cascade', requirements: [{ metric: 'finishedRaces', target: 50 }, { metric: 'badgesEarned', target: 2 }] },
  { id: 'zapdos', dex: 145, badge: 'thunder', requirements: [{ metric: 'wins', target: 25 }, { metric: 'badgesEarned', target: 4 }] },
  { id: 'moltres', dex: 146, badge: 'rainbow', requirements: [{ metric: 'accurateRaces', target: 30 }, { metric: 'badgesEarned', target: 6 }] },
  { id: 'mewtwo', dex: 150, badge: 'soul', requirements: [{ metric: 'finishedRaces', target: 200 }, { metric: 'badgesEarned', target: 8 }] },
  { id: 'mew', dex: 151, badge: 'marsh', requirements: [{ metric: 'speciesOwned', target: 100 }, { metric: 'badgesEarned', target: 8 }] },
] as const satisfies readonly { id: string; dex: number; badge: string; requirements: readonly Requirement[] }[];
export const accurateRaceThreshold = 0.95;
export const legendaryLevel = 5;
export function meetsRequirements(metrics: AchievementMetrics, requirements: readonly Requirement[]): boolean {
  return requirements.every(({ metric, target }) => Number.isFinite(metrics[metric]) && metrics[metric] >= target);
}
