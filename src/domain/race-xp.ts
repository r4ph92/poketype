import { gameConfig } from '@/config/game';

const { base, beatEveryoneBonus, minimumRacers } = gameConfig.progression.raceXp;

// racers counts everyone who started the race; place is null for an abandoner, who earns nothing and ranks behind everyone still racing.
// Tied racers share the better place (1, 1, 3), so each earns that place's XP.
export function raceXpFor(place: number | null, racers: number): number {
  if (place === null || racers < minimumRacers) return 0;
  const beaten = racers - place;
  return Math.round(base + (beatEveryoneBonus * beaten) / (racers - 1));
}
