import { gameConfig } from '@/config/game';
import type { TrainerStats } from './trainer-profile';

// bestWpm and the averages leave out abandoned and inactive races; races counts them.
export type ProfileStats = TrainerStats & { bestWpm: number | null };

export type WpmPoint = { raceId: string; endedAt: Date; wpm: number };

// progression holds the latest ranked races, oldest first, for the chart and its table.
export type ProfileSummary = { stats: ProfileStats; progression: WpmPoint[] };

export function oldestFirst(newestFirst: readonly WpmPoint[]): WpmPoint[] {
  return [...newestFirst].reverse();
}

export function canShowProgression(progression: readonly WpmPoint[]): boolean {
  return progression.length >= gameConfig.profile.minimumChartRaces;
}
