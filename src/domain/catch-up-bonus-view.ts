import { bonusCheckpoints, catchUpBonusKinds, type BonusCheckpoint, type CatchUpBonusKind } from './catch-up-bonus';
import { isCount, isJsonObject, type JsonObject } from './json-guards';
import { racerText } from './racer-text';

// A bonus as every race view sees it: who got it, at which leader checkpoint, and when, in milliseconds from the race start on the server clock.
export type CatchUpBonusView = { memberKey: string; checkpoint: BonusCheckpoint; kind: CatchUpBonusKind; wordsRemoved: number; awardedMs: number };

export type RaceBonuses = { catchUpBonuses: boolean; bonuses: CatchUpBonusView[] };

export function bonusesOfMember(bonuses: readonly CatchUpBonusView[], memberKey: string): CatchUpBonusView[] {
  return bonuses.filter((bonus) => bonus.memberKey === memberKey);
}

export function memberText(passage: string, bonuses: readonly CatchUpBonusView[], memberKey: string): string {
  return racerText(passage, bonusesOfMember(bonuses, memberKey).reduce((total, bonus) => total + bonus.wordsRemoved, 0));
}

// A race without bonuses never carries one.
export function parseRaceBonuses({ catchUpBonuses, bonuses }: JsonObject): RaceBonuses | null {
  if (typeof catchUpBonuses !== 'boolean' || !Array.isArray(bonuses)) return null;
  const parsed = bonuses.map(parseBonusView);
  if (!parsed.every((bonus) => bonus !== null)) return null;
  return catchUpBonuses || parsed.length === 0 ? { catchUpBonuses, bonuses: parsed } : null;
}

function parseBonusView(value: unknown): CatchUpBonusView | null {
  if (!isJsonObject(value)) return null;
  const { memberKey, checkpoint, kind, wordsRemoved, awardedMs } = value;
  if (typeof memberKey !== 'string' || !isCheckpoint(checkpoint) || !isBonusKind(kind) || !isCount(wordsRemoved) || wordsRemoved === 0 || !isCount(awardedMs)) return null;
  return { memberKey, checkpoint, kind, wordsRemoved, awardedMs };
}

function isCheckpoint(value: unknown): value is BonusCheckpoint {
  return bonusCheckpoints.some((checkpoint) => checkpoint === value);
}

function isBonusKind(value: unknown): value is CatchUpBonusKind {
  return catchUpBonusKinds.some((kind) => kind === value);
}
