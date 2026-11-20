import { and, asc, eq, sum } from 'drizzle-orm';
import type { BotCharacterId } from '@/assets/bot-characters';
import { botMemberKey } from '@/domain/bot-member';
import type { BonusCheckpoint, CatchUpBonusKind } from '@/domain/catch-up-bonus';
import type { CatchUpBonusView } from '@/domain/catch-up-bonus-view';
import type { GuestId } from '@/domain/guest-id';
import { passageLength } from '@/domain/passage';
import { racerText, racerTextLength } from '@/domain/racer-text';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';
import type { CurrentRace } from './race-rows';

export type RaceBonusRow = { guestId: GuestId | null; botCharacter: BotCharacterId | null; checkpoint: BonusCheckpoint; kind: CatchUpBonusKind; wordsRemoved: number; awardedAt: Date };

// A race without catch-up bonuses never reads the table.
export async function findRaceBonuses(executor: DatabaseExecutor, race: Pick<CurrentRace, 'id' | 'catchUpBonuses'>): Promise<RaceBonusRow[]> {
  if (!race.catchUpBonuses) return [];
  return executor
    .select({
      guestId: schema.raceBonuses.guestId,
      botCharacter: schema.raceBonuses.botCharacter,
      checkpoint: schema.raceBonuses.checkpoint,
      kind: schema.raceBonuses.kind,
      wordsRemoved: schema.raceBonuses.wordsRemoved,
      awardedAt: schema.raceBonuses.awardedAt,
    })
    .from(schema.raceBonuses)
    .where(eq(schema.raceBonuses.raceId, race.id))
    .orderBy(asc(schema.raceBonuses.awardedAt), asc(schema.raceBonuses.checkpoint));
}

// A player is named by their guest id and a bot by its member key, which never looks like a uuid.
export function bonusRacerKey({ guestId, botCharacter }: Pick<RaceBonusRow, 'guestId' | 'botCharacter'>): string {
  return botCharacter === null ? (guestId ?? '') : botMemberKey(botCharacter);
}

export function bonusesOf(bonuses: readonly RaceBonusRow[], racerKey: string): RaceBonusRow[] {
  return bonuses.filter((bonus) => bonusRacerKey(bonus) === racerKey);
}

export function wordsRemovedFrom(bonuses: readonly RaceBonusRow[]): number {
  return bonuses.reduce((total, bonus) => total + bonus.wordsRemoved, 0);
}

export function racerTextIn(race: Pick<CurrentRace, 'passage'>, bonuses: readonly RaceBonusRow[], racerKey: string): string {
  return racerText(race.passage, wordsRemovedFrom(bonusesOf(bonuses, racerKey)));
}

// The length of a player's own text, read on every progress report.
export async function findPlayerTextLength(executor: DatabaseExecutor, race: Pick<CurrentRace, 'id' | 'passage' | 'catchUpBonuses'>, guestId: GuestId): Promise<number> {
  if (!race.catchUpBonuses) return passageLength(race.passage);
  const [row] = await executor
    .select({ wordsRemoved: sum(schema.raceBonuses.wordsRemoved).mapWith(Number) })
    .from(schema.raceBonuses)
    .where(and(eq(schema.raceBonuses.raceId, race.id), eq(schema.raceBonuses.guestId, guestId)));
  return racerTextLength(race.passage, row?.wordsRemoved ?? 0);
}

// Every race view names a racer by member key; a bonus of a player no longer in the room or the results is left out.
export function toBonusViews(race: Pick<CurrentRace, 'startsAt'>, bonuses: readonly RaceBonusRow[], memberKeys: ReadonlyMap<GuestId, string>): CatchUpBonusView[] {
  return bonuses.flatMap((bonus) => {
    const memberKey = bonus.botCharacter === null ? memberKeys.get(bonus.guestId!) : botMemberKey(bonus.botCharacter);
    if (memberKey === undefined) return [];
    const { checkpoint, kind, wordsRemoved, awardedAt } = bonus;
    return [{ memberKey, checkpoint, kind, wordsRemoved, awardedMs: Math.max(0, awardedAt.getTime() - race.startsAt.getTime()) }];
  });
}
