import { gameConfig } from '@/config/game';

export type StarterDex = (typeof gameConfig.progression.starterDexes)[number];

const starterDexes: readonly StarterDex[] = gameConfig.progression.starterDexes;

export function parseStarterDex(submitted: FormDataEntryValue | null): StarterDex | null {
  return starterDexes.find((dex) => submitted === String(dex)) ?? null;
}
