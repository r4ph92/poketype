import { describe, expect, it } from 'vitest';
import { legendaryRewards, meetsRequirements, type AchievementMetrics } from '../../src/config/achievements';
import { pokedex } from '../../src/assets/pokedex';
import { speciesOfDex } from '../../src/domain/pokemon-catalog';

const empty: AchievementMetrics = { finishedRaces: 0, wins: 0, accurateRaces: 0, speciesOwned: 0, badgesEarned: 0 };
describe('legendary achievement goals', () => {
  it('has 649 unique species, including the five Kanto reward legendaries', () => {
    expect(new Set(pokedex.map((entry) => entry.dex)).size).toBe(649);
    for (const reward of legendaryRewards) expect(speciesOfDex(reward.dex)).toBe(reward.id);
  });
  for (const reward of legendaryRewards) {
    it(`${reward.id} requires every threshold and rejects missing progress`, () => {
      const achieved = { ...empty };
      for (const requirement of reward.requirements) achieved[requirement.metric] = requirement.target;
      expect(meetsRequirements(achieved, reward.requirements)).toBe(true);
      for (const requirement of reward.requirements) {
        expect(meetsRequirements({ ...achieved, [requirement.metric]: requirement.target - 1 }, reward.requirements)).toBe(false);
        expect(meetsRequirements({ ...achieved, [requirement.metric]: NaN }, reward.requirements)).toBe(false);
      }
    });
  }
});
