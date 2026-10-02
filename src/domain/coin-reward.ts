import { isCount, isJsonObject } from './json-guards';

// What one race paid the viewer in Poké Dollars: race for their place, badges for the bonus of every badge the race earned them.
export type CoinReward = { race: number; badges: number };

// undefined means malformed, so a snapshot without the field is rejected rather than read as "no reward".
export function parseCoinReward(value: unknown): CoinReward | null | undefined {
  if (value === null) return null;
  if (!isJsonObject(value) || !isCount(value.race) || !isCount(value.badges)) return undefined;
  return { race: value.race, badges: value.badges };
}
