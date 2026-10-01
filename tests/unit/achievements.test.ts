import { describe, expect, it } from 'vitest';
import { legendaryRewards, meetsRequirements, type AchievementMetrics } from '../../src/config/achievements';
import { pokedex } from '../../src/assets/pokedex';
import { pokemonArtwork } from '../../src/assets/pokemon';

const empty: AchievementMetrics = { finishedRaces: 0, wins: 0, accurateRaces: 0, speciesOwned: 0, badgesEarned: 0 };
describe('legendary achievement goals', () => {
  it('has 151 unique species, including all five reward sprites', () => {
    expect(pokedex).toHaveLength(151);
    expect(new Set(pokedex.map((entry) => entry.dex)).size).toBe(151);
    for (const reward of legendaryRewards) expect(pokemonArtwork[reward.id].dex).toBe(reward.dex);
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
