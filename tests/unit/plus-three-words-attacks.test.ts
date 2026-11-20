import { describe, expect, it } from 'vitest';
import { awardDueBonuses, type BonusAward, type BonusDraw, type BonusRacer } from '../../src/domain/catch-up-bonus';
import { memberText } from '../../src/domain/catch-up-bonus-view';
import type { GuestId } from '../../src/domain/guest-id';
import { findRaceBonuses, racerTextIn, toBonusViews, type RaceBonusRow } from '../../src/server/rooms/race-bonuses';
import type { DatabaseExecutor } from '../../src/server/db/types';

const passage = Array.from({ length: 20 }, () => 'chat').join(' ');
const maya = '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b' as GuestId;
const zoe = '1b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b' as GuestId;
const startsAt = new Date(1_790_000_000_000);
const memberKeys = new Map([[maya, 'm'], [zoe, 'z']]);

function racer(racerKey: string, position: number): BonusRacer {
  return { racerKey, position, isFinished: false, isOut: false, edits: [], bonusesReceived: 0 };
}

function sequentialDraw(words: string[]): BonusDraw {
  let next = 0;
  return { kind: () => 'add-words', words: () => words[next++] ?? null };
}

function rowOf(award: BonusAward, awardedAt: Date): RaceBonusRow {
  const receiver = award.racerKey.startsWith('bot:') ? { guestId: null, botCharacter: award.racerKey.slice(4) as RaceBonusRow['botCharacter'] } : { guestId: award.racerKey as GuestId, botCharacter: null };
  if (award.kind === 'remove-words') return { ...receiver, checkpoint: award.checkpoint, kind: award.kind, wordsRemoved: award.wordsRemoved, targetGuestId: null, targetBotCharacter: null, addedWords: null, awardedAt };
  return { ...receiver, checkpoint: award.checkpoint, kind: award.kind, wordsRemoved: 0, targetGuestId: award.targetKey as GuestId, targetBotCharacter: null, addedWords: award.addedWords, awardedAt };
}

// The database hands rows of one checkpoint back in any order; findRaceBonuses must restore the engine's order.
function executorReturning(rows: RaceBonusRow[]): DatabaseExecutor {
  const chain = { from: () => chain, where: () => chain, orderBy: () => Promise.resolve(rows) };
  return { select: () => chain } as unknown as DatabaseExecutor;
}

describe('two trailers drawing "+3 mots" at the same checkpoint', () => {
  it('appends both draws to the leader, and the server and every view rebuild the same text whatever order the rows come back in', async () => {
    const outcome = awardDueBonuses({ isEnabled: true, passage, checkpointsPassed: 0, racers: [racer(maya, 30), racer('bot:misty', 2), racer('bot:brock', 1)] }, sequentialDraw(['un deux trois', 'quatre cinq six']));
    const awardedAt = new Date(startsAt.getTime() + 9_000);
    const rows = outcome.awards.map((award) => rowOf(award, awardedAt));
    const bonuses = await findRaceBonuses(executorReturning([...rows].reverse()), { id: 'race', catchUpBonuses: true } as never);
    const views = toBonusViews({ startsAt }, bonuses, memberKeys);

    expect(outcome.awards.map((award) => award.racerKey)).toEqual(['bot:brock', 'bot:misty']);
    expect(racerTextIn({ passage }, bonuses, maya)).toBe(`${passage} un deux trois quatre cinq six`);
    expect(memberText(passage, views, 'm')).toBe(racerTextIn({ passage }, bonuses, maya));
    expect(memberText(passage, views, 'bot:brock')).toBe(passage);
  });
});

describe('a racer who got "-3 mots" and later leads', () => {
  it('has the removed words gone first and the added words appended after, on the server and in every view', () => {
    const removed: RaceBonusRow = { guestId: zoe, botCharacter: null, checkpoint: 25, kind: 'remove-words', wordsRemoved: 3, targetGuestId: null, targetBotCharacter: null, addedWords: null, awardedAt: new Date(startsAt.getTime() + 5_000) };
    const added: RaceBonusRow = { guestId: maya, botCharacter: null, checkpoint: 75, kind: 'add-words', wordsRemoved: 0, targetGuestId: zoe, targetBotCharacter: null, addedWords: 'forêt garçon élève', awardedAt: new Date(startsAt.getTime() + 20_000) };
    const views = toBonusViews({ startsAt }, [removed, added], memberKeys);
    const shortened = Array.from({ length: 17 }, () => 'chat').join(' ');

    expect(racerTextIn({ passage }, [removed, added], zoe)).toBe(`${shortened} forêt garçon élève`);
    expect(memberText(passage, views, 'z')).toBe(racerTextIn({ passage }, [removed, added], zoe));
    expect(memberText(passage, views, 'm')).toBe(passage);
  });
});
