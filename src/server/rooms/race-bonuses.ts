import { asc, eq } from 'drizzle-orm';
import type { BotCharacterId } from '@/assets/bot-characters';
import { botMemberKey } from '@/domain/bot-member';
import { compareRacerKeys, type BonusCheckpoint, type CatchUpBonusKind } from '@/domain/catch-up-bonus';
import type { CatchUpBonusView } from '@/domain/catch-up-bonus-view';
import type { GuestId } from '@/domain/guest-id';
import { passageLength } from '@/domain/passage';
import { editedText, type TextEdit } from '@/domain/racer-text';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';
import type { CurrentRace } from './race-rows';

// guestId or botCharacter is the receiver; the target is the leader that "+3 mots" lengthens or "Brouillard" blurs.
export type RaceBonusRow = {
  guestId: GuestId | null;
  botCharacter: BotCharacterId | null;
  checkpoint: BonusCheckpoint;
  kind: CatchUpBonusKind;
  wordsRemoved: number;
  targetGuestId: GuestId | null;
  targetBotCharacter: BotCharacterId | null;
  addedWords: string | null;
  awardedAt: Date;
};

// A race without catch-up bonuses never reads the table. The rows come back in award order, receivers of one checkpoint by racer key,
// the order the engine applied them in, so every text is rebuilt exactly as it was.
export async function findRaceBonuses(executor: DatabaseExecutor, race: Pick<CurrentRace, 'id' | 'catchUpBonuses'>): Promise<RaceBonusRow[]> {
  if (!race.catchUpBonuses) return [];
  const rows = await executor
    .select({
      guestId: schema.raceBonuses.guestId,
      botCharacter: schema.raceBonuses.botCharacter,
      checkpoint: schema.raceBonuses.checkpoint,
      kind: schema.raceBonuses.kind,
      wordsRemoved: schema.raceBonuses.wordsRemoved,
      targetGuestId: schema.raceBonuses.targetGuestId,
      targetBotCharacter: schema.raceBonuses.targetBotCharacter,
      addedWords: schema.raceBonuses.addedWords,
      awardedAt: schema.raceBonuses.awardedAt,
    })
    .from(schema.raceBonuses)
    .where(eq(schema.raceBonuses.raceId, race.id))
    .orderBy(asc(schema.raceBonuses.awardedAt), asc(schema.raceBonuses.checkpoint));
  return rows.sort(inAwardOrder);
}

function inAwardOrder(first: RaceBonusRow, second: RaceBonusRow): number {
  const byTime = first.awardedAt.getTime() - second.awardedAt.getTime();
  if (byTime !== 0) return byTime;
  return first.checkpoint - second.checkpoint || compareRacerKeys({ racerKey: bonusRacerKey(first) }, { racerKey: bonusRacerKey(second) });
}

// A player is named by their guest id and a bot by its member key, which never looks like a uuid.
export function bonusRacerKey({ guestId, botCharacter }: Pick<RaceBonusRow, 'guestId' | 'botCharacter'>): string {
  return botCharacter === null ? (guestId ?? '') : botMemberKey(botCharacter);
}

// The racer whose own text the bonus changed: the receiver for "-3 mots", the leader for "+3 mots", nobody for "Brouillard".
function bonusTextOwnerKey(bonus: RaceBonusRow): string | null {
  if (bonus.kind === 'fog') return null;
  if (bonus.kind === 'remove-words') return bonusRacerKey(bonus);
  return bonusRacerKey({ guestId: bonus.targetGuestId, botCharacter: bonus.targetBotCharacter });
}

export function bonusesOf(bonuses: readonly RaceBonusRow[], racerKey: string): RaceBonusRow[] {
  return bonuses.filter((bonus) => bonusRacerKey(bonus) === racerKey);
}

export function textEditsOf(bonuses: readonly RaceBonusRow[], racerKey: string): TextEdit[] {
  return bonuses.filter((bonus) => bonusTextOwnerKey(bonus) === racerKey).map(textEditOfRow);
}

function textEditOfRow({ kind, wordsRemoved, addedWords }: RaceBonusRow): TextEdit {
  return kind === 'add-words' ? { kind, addedWords: addedWords ?? '' } : { kind: 'remove-words', wordsRemoved };
}

export function racerTextIn(race: Pick<CurrentRace, 'passage'>, bonuses: readonly RaceBonusRow[], racerKey: string): string {
  return editedText(race.passage, textEditsOf(bonuses, racerKey));
}

export function racerTextLengthIn(race: Pick<CurrentRace, 'passage'>, bonuses: readonly RaceBonusRow[], racerKey: string): number {
  return passageLength(racerTextIn(race, bonuses, racerKey));
}

// Every race view names a racer by member key; a bonus of a player no longer in the room or the results is left out, and a "+3 mots"
// or "Brouillard" whose leader left keeps its receiver but no target.
export function toBonusViews(race: Pick<CurrentRace, 'startsAt'>, bonuses: readonly RaceBonusRow[], memberKeys: ReadonlyMap<GuestId, string>): CatchUpBonusView[] {
  return bonuses.flatMap((bonus) => toBonusView(race, bonus, memberKeys) ?? []);
}

function toBonusView(race: Pick<CurrentRace, 'startsAt'>, bonus: RaceBonusRow, memberKeys: ReadonlyMap<GuestId, string>): CatchUpBonusView | null {
  const memberKey = viewKeyOf(bonus.guestId, bonus.botCharacter, memberKeys);
  if (memberKey === null) return null;
  const base = { memberKey, checkpoint: bonus.checkpoint, awardedMs: Math.max(0, bonus.awardedAt.getTime() - race.startsAt.getTime()) };
  if (bonus.kind === 'remove-words') return { ...base, kind: bonus.kind, wordsRemoved: bonus.wordsRemoved };
  const targetKey = viewKeyOf(bonus.targetGuestId, bonus.targetBotCharacter, memberKeys);
  if (bonus.kind === 'fog') return { ...base, kind: bonus.kind, targetKey };
  return { ...base, kind: bonus.kind, targetKey, addedWords: bonus.addedWords ?? '' };
}

function viewKeyOf(guestId: GuestId | null, botCharacter: BotCharacterId | null, memberKeys: ReadonlyMap<GuestId, string>): string | null {
  if (botCharacter !== null) return botMemberKey(botCharacter);
  return guestId === null ? null : (memberKeys.get(guestId) ?? null);
}
