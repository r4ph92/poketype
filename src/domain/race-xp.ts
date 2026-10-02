import { gameConfig } from '@/config/game';
import { placeReward } from './race-reward';

export function raceXpFor(place: number | null, racers: number): number {
  return placeReward(gameConfig.progression.raceXp, place, racers);
}
