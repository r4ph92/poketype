import { bonusCheckpoints, type BonusCheckpoint } from './catch-up-bonus';
import { isCount, isJsonObject, type JsonObject } from './json-guards';
import { editedText, type TextEdit } from './racer-text';

type BonusViewBase = { memberKey: string; checkpoint: BonusCheckpoint; awardedMs: number };

// A bonus as every race view sees it: who got it, at which leader checkpoint, and when, in milliseconds from the race start on the server clock.
// "+3 mots" also names the leader whose text grew (null once that player is out of the view) and the words appended to it;
// "Brouillard" names the leader whose next words blur.
export type CatchUpBonusView =
  | (BonusViewBase & { kind: 'remove-words'; wordsRemoved: number })
  | (BonusViewBase & { kind: 'add-words'; targetKey: string | null; addedWords: string })
  | (BonusViewBase & { kind: 'fog'; targetKey: string | null });

export type RaceBonuses = { catchUpBonuses: boolean; bonuses: CatchUpBonusView[] };

export function bonusesOfMember(bonuses: readonly CatchUpBonusView[], memberKey: string): CatchUpBonusView[] {
  return bonuses.filter((bonus) => bonus.memberKey === memberKey);
}

// The member's own text: the passage with every bonus that changed it, in the order the snapshot lists them, which is the award order.
// "Brouillard" changes no text.
export function memberText(passage: string, bonuses: readonly CatchUpBonusView[], memberKey: string): string {
  return editedText(passage, bonuses.flatMap((bonus) => textEditOf(bonus, memberKey)));
}

function textEditOf(bonus: CatchUpBonusView, memberKey: string): TextEdit[] {
  if (bonus.kind === 'add-words') return bonus.targetKey === memberKey ? [{ kind: bonus.kind, addedWords: bonus.addedWords }] : [];
  if (bonus.kind === 'remove-words') return bonus.memberKey === memberKey ? [{ kind: bonus.kind, wordsRemoved: bonus.wordsRemoved }] : [];
  return [];
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
  const { memberKey, checkpoint, awardedMs } = value;
  if (typeof memberKey !== 'string' || !isCheckpoint(checkpoint) || !isCount(awardedMs)) return null;
  const base = { memberKey, checkpoint, awardedMs };
  if (value.kind === 'remove-words') return parseRemoveWords(base, value);
  if (value.kind === 'fog') return parseFog(base, value);
  return value.kind === 'add-words' ? parseAddWords(base, value) : null;
}

function parseFog(base: BonusViewBase, { targetKey }: JsonObject): CatchUpBonusView | null {
  return isTargetKey(targetKey) ? { ...base, kind: 'fog', targetKey } : null;
}

function isTargetKey(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parseRemoveWords(base: BonusViewBase, { wordsRemoved }: JsonObject): CatchUpBonusView | null {
  return isCount(wordsRemoved) && wordsRemoved > 0 ? { ...base, kind: 'remove-words', wordsRemoved } : null;
}

// Added words are plain words separated by single spaces, so they never break a text's word boundaries.
function parseAddWords(base: BonusViewBase, { targetKey, addedWords }: JsonObject): CatchUpBonusView | null {
  if (!isTargetKey(targetKey) || typeof addedWords !== 'string' || !wordsPattern.test(addedWords)) return null;
  return { ...base, kind: 'add-words', targetKey, addedWords };
}

const wordsPattern = /^[^\s]+( [^\s]+)*$/u;

function isCheckpoint(value: unknown): value is BonusCheckpoint {
  return bonusCheckpoints.some((checkpoint) => checkpoint === value);
}
