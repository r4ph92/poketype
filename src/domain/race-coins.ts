import { gameConfig } from '@/config/game';
import { placeReward } from './race-reward';

export function raceCoinsFor(place: number | null, racers: number): number {
  return placeReward(gameConfig.economy.raceCoins, place, racers);
}
