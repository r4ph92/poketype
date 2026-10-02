import { gameConfig } from '@/config/game';

// What the winner and the last racer earn: base for the last, base + beatEveryoneBonus for the winner.
export type PlaceRewardScale = { base: number; beatEveryoneBonus: number };

// racers counts everyone who started the race, abandoners included.
export function countsForRaceRewards(racers: number): boolean {
  return racers >= gameConfig.progression.rewardMinimumRacers;
}

// place is null for an abandoner, who earns nothing and ranks behind everyone still racing.
// Tied racers share the better place (1, 1, 3), so each earns that place's reward.
export function placeReward({ base, beatEveryoneBonus }: PlaceRewardScale, place: number | null, racers: number): number {
  if (place === null || !countsForRaceRewards(racers)) return 0;
  const beaten = racers - place;
  return Math.round(base + (beatEveryoneBonus * beaten) / (racers - 1));
}
