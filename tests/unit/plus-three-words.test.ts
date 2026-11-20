import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { raceWordLists } from '../../src/assets/word-lists';
import { gameConfig } from '../../src/config/game';
import { awardDueBonuses, drawBonusKind, type BonusDraw, type BonusRacer, type CheckpointRace } from '../../src/domain/catch-up-bonus';
import { memberText, parseRaceBonuses, type CatchUpBonusView } from '../../src/domain/catch-up-bonus-view';
import { passageLength } from '../../src/domain/passage';
import { measureRacer } from '../../src/domain/race-results';
import { drawBonusWords } from '../../src/domain/race-text';
import { defaultTextSettings } from '../../src/domain/text-settings';
import { progressPercent } from '../../src/domain/typing-progress';
import type { RoomMemberView } from '../../src/domain/room-view';
import { CatchUpBonusBanner } from '../../src/features/race/CatchUpBonusBanner';
import { RaceAnnouncements } from '../../src/features/race/RaceAnnouncements';
import { ResultsTable } from '../../src/features/race/ResultsTable';
import { announcedBonuses, leaderNoticeBonus, type LeaderBonusView } from '../../src/features/race/race-bonus-announcements';
import { racersWithLocalViewer } from '../../src/features/race/racers';
import { resultsTableRows } from '../../src/features/race/results-table';
import { catchUpBonusesRequestSchema } from '../../src/server/validation/room-schemas';
import { progressReportRequestSchema } from '../../src/server/validation/race-schemas';
import { racerTextIn, toBonusViews, type RaceBonusRow } from '../../src/server/rooms/race-bonuses';
import type { GuestId } from '../../src/domain/guest-id';

type ProviderProps = ComponentProps<typeof NextIntlClientProvider>;

const catalogs = { fr, en } as const;
// Twenty words of four letters: 99 characters.
const passage = Array.from({ length: 20 }, () => 'chat').join(' ');
const addedWords = 'forêt garçon élève';
const addWords: BonusDraw = { kind: () => 'add-words', words: () => addedWords };

function racer(racerKey: string, position: number, extra: Partial<BonusRacer> = {}): BonusRacer {
  return { racerKey, position, isFinished: false, isOut: false, edits: [], bonusesReceived: 0, ...extra };
}

function race(racers: BonusRacer[], extra: Partial<CheckpointRace> = {}): CheckpointRace {
  return { isEnabled: true, passage, checkpointsPassed: 0, racers, ...extra };
}

// The markup with its apostrophes decoded, so catalog strings compare as written.
function render(locale: 'fr' | 'en', element: Parameters<typeof renderToStaticMarkup>[0]): string {
  const messages = { Room: catalogs[locale].Room, Bots: catalogs[locale].Bots, Pokemon: catalogs[locale].Pokemon, Animation: catalogs[locale].Animation };
  return renderToStaticMarkup(createElement(NextIntlClientProvider, { locale, messages, timeZone: 'UTC' } as ProviderProps, element)).replaceAll('&#x27;', "'");
}

const zoeAddsToMaya: LeaderBonusView = { memberKey: 'zoe', checkpoint: 25, kind: 'add-words', targetKey: 'maya', addedWords, awardedMs: 10_000 };
const progress = { position: 0, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0, disconnected: false, abandonedOffline: false, lastSeenMs: 0 };
const member = { hasAccount: false, isHost: false, isSpectator: false, partner: null, profile: null, bot: null, avatarSeed: null };
const members: RoomMemberView[] = [
  { ...member, memberKey: 'maya', trainerName: 'Maya', isViewer: true, progress: { ...progress, position: 50 } },
  { ...member, memberKey: 'zoe', trainerName: 'Zoé', isViewer: false, progress: { ...progress, position: 10 } },
];

describe('the "+3 mots" bonus at a checkpoint (BONUS-02)', () => {
  it('appends three words to the current leader\'s text only, and the trailing racer is its receiver', () => {
    const outcome = awardDueBonuses(race([racer('maya', 25), racer('leo', 20), racer('zoe', 5)]), addWords);
    const views = outcome.awards.flatMap((award): CatchUpBonusView[] => (award.kind === 'add-words' ? [{ memberKey: award.racerKey, checkpoint: award.checkpoint, kind: award.kind, targetKey: award.targetKey, addedWords: award.addedWords, awardedMs: 0 }] : []));

    expect(outcome.awards).toEqual([{ racerKey: 'zoe', checkpoint: 25, kind: 'add-words', targetKey: 'maya', addedWords }]);
    expect(memberText(passage, views, 'maya')).toBe(`${passage} ${addedWords}`);
    expect(memberText(passage, views, 'zoe')).toBe(passage);
    expect(memberText(passage, views, 'leo')).toBe(passage);
    expect(addedWords.split(' ')).toHaveLength(gameConfig.catchUpBonuses.addedWords);
  });

  it('measures the leader on the longer text at the next checkpoint', () => {
    // Maya at 50 of 99 is past 50 %, but on her text grown by 20 characters she is at 42 %: the 50 % checkpoint waits.
    const grown = racer('maya', 50, { edits: [{ kind: 'add-words', addedWords: 'abcd abcd abcd abcd' }] });

    expect(awardDueBonuses(race([grown, racer('zoe', 0, { bonusesReceived: 1 })], { checkpointsPassed: 1 }), addWords).checkpointsPassed).toBe(1);
  });

  it('lengthens a single leader on a tie, the first by racer key', () => {
    const outcome = awardDueBonuses(race([racer('maya', 30), racer('ana', 30), racer('zoe', 0)]), addWords);

    expect(outcome.awards).toEqual([expect.objectContaining({ racerKey: 'zoe', targetKey: 'ana' })]);
  });

  it('gives "-3 mots" instead when the leader has finished or no word can be drawn', () => {
    const finishedLeader = awardDueBonuses(race([racer('maya', 99, { isFinished: true }), racer('zoe', 0)], { checkpointsPassed: 2 }), addWords);
    const noWord = awardDueBonuses(race([racer('maya', 30), racer('zoe', 0)]), { kind: () => 'add-words', words: () => null });

    expect(finishedLeader.awards.map((award) => award.kind)).toEqual(['remove-words']);
    expect(noWord.awards.map((award) => award.kind)).toEqual(['remove-words']);
  });

  it('draws each kind by its configured weight', () => {
    const { 'remove-words': removeWeight, 'add-words': addWeight, fog: fogWeight } = gameConfig.catchUpBonuses.kindWeights;
    const total = removeWeight + addWeight + fogWeight;
    const removeShare = removeWeight / total;
    const addShare = (removeWeight + addWeight) / total;

    expect(drawBonusKind(() => 0)).toBe('remove-words');
    expect(drawBonusKind(() => removeShare - 0.001)).toBe('remove-words');
    expect(drawBonusKind(() => removeShare + 0.001)).toBe('add-words');
    expect(drawBonusKind(() => addShare - 0.001)).toBe('add-words');
    expect(drawBonusKind(() => addShare + 0.001)).toBe('fog');
    expect(drawBonusKind(() => 0.999_999)).toBe('fog');
  });

});

describe('the words "+3 mots" appends', () => {
  const firstIndex = () => 0;
  const spread = (count: number) => Math.floor(count / 2);

  it('come from the race language list, in NFC, as plain single-spaced words', () => {
    const frenchWords = drawBonusWords({ ...defaultTextSettings('fr'), accents: true }, raceWordLists, 3, spread)!;
    const englishWords = drawBonusWords(defaultTextSettings('en'), raceWordLists, 3, spread)!;

    expect(frenchWords.split(' ').every((word) => raceWordLists.fr.includes(word))).toBe(true);
    expect(englishWords.split(' ').every((word) => raceWordLists.en.includes(word))).toBe(true);
    expect(frenchWords).toBe(frenchWords.normalize('NFC'));
    expect(frenchWords).toMatch(/^\S+ \S+ \S+$/u);
  });

  it('keep the accents and excluded characters the host chose', () => {
    const withAccents = drawBonusWords({ ...defaultTextSettings('fr'), accents: true }, raceWordLists, 40, (count) => Math.floor(Math.random() * count))!;
    const plain = drawBonusWords({ ...defaultTextSettings('fr'), accents: false }, raceWordLists, 40, (count) => Math.floor(Math.random() * count))!;
    const withoutE = drawBonusWords({ ...defaultTextSettings('fr'), exclude: ['e'] }, raceWordLists, 40, (count) => Math.floor(Math.random() * count))!;

    expect(withAccents).toMatch(/[à-ÿ]/u);
    expect(plain).toMatch(/^[a-z ]+$/u);
    expect(withoutE).not.toContain('e');
    expect(drawBonusWords(defaultTextSettings('fr'), raceWordLists, 3, firstIndex)).not.toBeNull();
  });
});

describe('progress on a lengthened text (BONUS-04)', () => {
  it('recomputes the leader\'s percentage against the new length for every racer view', () => {
    const racers = racersWithLocalViewer(members, members[0]!.progress!, { passage, bonuses: [zoeAddsToMaya] });
    const maya = racers.find((entry) => entry.memberKey === 'maya')!;
    const zoe = racers.find((entry) => entry.memberKey === 'zoe')!;

    expect(maya.textLength).toBe(passageLength(`${passage} ${addedWords}`));
    expect(progressPercent(maya.progress.position, maya.textLength)).toBeLessThan(progressPercent(50, passageLength(passage)));
    expect(zoe.textLength).toBe(passageLength(passage));
  });

  it('finishes the leader only at the end of the longer text', () => {
    const atOldEnd = { ...members[0]!, progress: { ...progress, position: passageLength(passage) } };
    const atNewEnd = { ...members[0]!, progress: { ...progress, position: passageLength(`${passage} ${addedWords}`) } };

    expect(racersWithLocalViewer([atOldEnd], atOldEnd.progress, { passage, bonuses: [zoeAddsToMaya] })[0]!.isFinished).toBe(false);
    expect(racersWithLocalViewer([atNewEnd], atNewEnd.progress, { passage, bonuses: [zoeAddsToMaya] })[0]!.isFinished).toBe(true);
  });

  it('rebuilds the same text on the server and in every view, edits applied in award order', () => {
    const maya = '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b' as GuestId;
    const zoe = '1b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b' as GuestId;
    const startsAt = new Date(1_790_000_000_000);
    const row = (checkpoint: 25 | 50, words: string): RaceBonusRow => ({ guestId: zoe, botCharacter: null, checkpoint, kind: 'add-words', wordsRemoved: 0, targetGuestId: maya, targetBotCharacter: null, addedWords: words, awardedAt: new Date(startsAt.getTime() + checkpoint * 1000) });
    const rows = [row(25, 'un deux trois'), row(50, 'quatre cinq six')];
    const views = toBonusViews({ startsAt }, rows, new Map([[maya, 'm'], [zoe, 'z']]));

    expect(racerTextIn({ passage }, rows, maya)).toBe(`${passage} un deux trois quatre cinq six`);
    expect(memberText(passage, views, 'm')).toBe(racerTextIn({ passage }, rows, maya));
    expect(memberText(passage, views, 'z')).toBe(passage);
  });
});

describe('results after a "+3 mots" (BONUS-03, BONUS-04)', () => {
  it('counts only the characters the leader really typed in the WPM', () => {
    const typedCharacters = passageLength(passage) + 7;
    const { grossWpm } = measureRacer({ typedCharacters, keystrokes: typedCharacters, rejectedKeystrokes: 0, elapsedMs: 60_000 });

    expect(grossWpm).toBeCloseTo(typedCharacters / gameConfig.scoring.charactersPerWord);
  });

  it.each(['fr', 'en'] as const)('in %s, lists "+3 mots" under the receiver\'s "Bonus reçus", not the leader\'s', (locale) => {
    const result = { standing: 'ranked', outcome: 'finished', grossWpm: 40, rawWpm: 41, score: 40, accuracy: 1, errors: 0, finishMs: 30_000 } as const;
    const racers = members.map(({ memberKey, trainerName, avatarSeed, isViewer, partner, bot }) => ({ memberKey, trainerName, avatarSeed, isViewer, partner, bot }));
    const rows = resultsTableRows([{ ...result, memberKey: 'maya', place: 1 }, { ...result, memberKey: 'zoe', place: 2 }], racers, [zoeAddsToMaya]);
    const cells = [...render(locale, createElement(ResultsTable, { rows })).matchAll(/<td data-bonuses="(\d)"[^>]*>([^<]*)<\/td>/g)].map((match) => match[2]);

    expect(rows.map((row) => row.bonuses)).toEqual([[], ['add-words']]);
    expect(cells).toEqual(['—', catalogs[locale].Room.bonusAddWords.replaceAll(' ', ' ')]);
  });
});

describe('the leader\'s notice (BONUS-03)', () => {
  it('shows for the configured time to the racer whose text grew', () => {
    expect(leaderNoticeBonus([zoeAddsToMaya], 'maya', 11_000)).toEqual(zoeAddsToMaya);
    expect(leaderNoticeBonus([zoeAddsToMaya], 'zoe', 11_000)).toBeUndefined();
    expect(leaderNoticeBonus([zoeAddsToMaya], 'maya', 10_000 + gameConfig.catchUpBonuses.announcementMs)).toBeUndefined();
  });

  it.each([
    ['fr', 'Ton texte s\'allonge de 3 mots !'],
    ['en', 'Your text grows by 3 words!'],
  ] as const)('in %s, tells the leader "%s" in the toast and the status region', (locale, notice) => {
    const racers = racersWithLocalViewer(members, members[0]!.progress!, { passage, bonuses: [zoeAddsToMaya] });

    expect(render(locale, createElement(CatchUpBonusBanner, { bonus: undefined, hinderedBy: zoeAddsToMaya }))).toContain(notice);
    expect(render(locale, createElement(RaceAnnouncements, { racers, announcedBonuses: announcedBonuses([zoeAddsToMaya], 11_000), hinderedBy: zoeAddsToMaya }))).toContain(notice);
  });

  it.each(['fr', 'en'] as const)('in %s, names "+3 mots" in the receiver\'s banner', (locale) => {
    const room = catalogs[locale].Room;
    const banner = render(locale, createElement(CatchUpBonusBanner, { bonus: zoeAddsToMaya }));

    expect(banner).toContain(room.bonusBannerAddWords.replace('{bonus}', room.bonusAddWords));
  });
});

describe('nobody but the server adds words (BONUS-01, COURSE-06)', () => {
  const report = { sequence: 3, position: 12, correctCharacters: 12, keystrokes: 12, rejectedKeystrokes: 0 };

  it.each([
    ['a word count', { ...report, addWords: 3 }],
    ['a forged bonus', { ...report, bonus: { kind: 'add-words', target: 'maya', words: 'a b c' } }],
    ['a text', { ...report, text: 'chat chat chat' }],
  ])('refuses a progress report carrying %s', (_label, body) => {
    expect(progressReportRequestSchema.safeParse(body).success).toBe(false);
  });

  it('refuses a bonus switch that asks for a kind or words', () => {
    expect(catchUpBonusesRequestSchema.safeParse({ enabled: true, kind: 'add-words' }).success).toBe(false);
    expect(catchUpBonusesRequestSchema.safeParse({ enabled: true, addedWords: 'a b c' }).success).toBe(false);
  });

  it('exposes no route that adds words or awards a bonus', () => {
    const roomRoutes = readdirSync(join(process.cwd(), 'src', 'app', 'api', 'rooms', '[roomId]'));

    expect(roomRoutes.filter((name) => /word|bonus/u.test(name))).toEqual(['catch-up-bonuses']);
  });

  it.each([
    ['added words with a line break', { ...zoeAddsToMaya, addedWords: 'un\ndeux' }],
    ['added words with a double space', { ...zoeAddsToMaya, addedWords: 'un  deux' }],
    ['no added words', { ...zoeAddsToMaya, addedWords: '' }],
    ['a numeric target', { ...zoeAddsToMaya, targetKey: 7 }],
  ])('refuses a race view whose "+3 mots" has %s', (_label, bonus) => {
    expect(parseRaceBonuses({ catchUpBonuses: true, bonuses: [bonus] })).toBeNull();
  });

  it('accepts a well-formed "+3 mots" view', () => {
    expect(parseRaceBonuses({ catchUpBonuses: true, bonuses: [zoeAddsToMaya] })?.bonuses).toEqual([zoeAddsToMaya]);
  });
});
