import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { gameConfig } from '../../src/config/game';
import { awardDueBonuses, type BonusDraw, type BonusRacer } from '../../src/domain/catch-up-bonus';
import { memberText, parseRaceBonuses } from '../../src/domain/catch-up-bonus-view';
import type { GuestId } from '../../src/domain/guest-id';
import { passageCharacters } from '../../src/domain/passage';
import type { RoomMemberView } from '../../src/domain/room-view';
import { applyInput, isPassageFinished, untypedState } from '../../src/domain/typing-progress';
import { CatchUpBonusBanner } from '../../src/features/race/CatchUpBonusBanner';
import { RaceAnnouncements } from '../../src/features/race/RaceAnnouncements';
import { RacePassage } from '../../src/features/race/RacePassage';
import { RaceRoster } from '../../src/features/race/RaceRoster';
import { ResultsTable } from '../../src/features/race/ResultsTable';
import { foggedUpcoming } from '../../src/features/race/passage-segments';
import { announcedBonuses, foggingBonus, leaderNoticeBonus, trackBadges, type LeaderBonusView } from '../../src/features/race/race-bonus-announcements';
import { racersWithLocalViewer } from '../../src/features/race/racers';
import { resultsTableRows } from '../../src/features/race/results-table';
import { racerTextIn, toBonusViews, type RaceBonusRow } from '../../src/server/rooms/race-bonuses';
import { catchUpBonusesRequestSchema } from '../../src/server/validation/room-schemas';
import { progressReportRequestSchema } from '../../src/server/validation/race-schemas';

type ProviderProps = ComponentProps<typeof NextIntlClientProvider>;

const catalogs = { fr, en } as const;
const passage = 'le chat dort sous la grande table de la cuisine et rêve de souris';
const { fogMs, foggedWords, announcementMs } = gameConfig.catchUpBonuses;
const fog: BonusDraw = { kind: () => 'fog', words: () => null };
const zoeFogsMaya: LeaderBonusView = { memberKey: 'zoe', checkpoint: 25, kind: 'fog', targetKey: 'maya', awardedMs: 10_000 };

function racer(racerKey: string, position: number, extra: Partial<BonusRacer> = {}): BonusRacer {
  return { racerKey, position, isFinished: false, isOut: false, edits: [], bonusesReceived: 0, ...extra };
}

function render(locale: 'fr' | 'en', element: Parameters<typeof renderToStaticMarkup>[0]): string {
  const messages = { Room: catalogs[locale].Room, Bots: catalogs[locale].Bots, Pokemon: catalogs[locale].Pokemon, Animation: catalogs[locale].Animation };
  return renderToStaticMarkup(createElement(NextIntlClientProvider, { locale, messages, timeZone: 'UTC' } as ProviderProps, element)).replaceAll('&#x27;', "'");
}

function visibleText(markup: string): string {
  return markup.replace(/<[^>]+>/g, '');
}

const progress = { position: 0, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0, disconnected: false, abandonedOffline: false, lastSeenMs: 0 };
const member = { hasAccount: false, isHost: false, isSpectator: false, partner: null, profile: null, bot: null, avatarSeed: null };
const members: RoomMemberView[] = [
  { ...member, memberKey: 'maya', trainerName: 'Maya', isViewer: true, progress: { ...progress, position: 30 } },
  { ...member, memberKey: 'zoe', trainerName: 'Zoé', isViewer: false, progress: { ...progress, position: 2 } },
];

describe('the "Brouillard" bonus at a checkpoint (BONUS-02)', () => {
  it('names the leader as its target and changes nobody\'s text', () => {
    const outcome = awardDueBonuses({ isEnabled: true, passage, checkpointsPassed: 0, racers: [racer('maya', 20), racer('zoe', 1)] }, fog);

    expect(outcome.awards).toEqual([{ racerKey: 'zoe', checkpoint: 25, kind: 'fog', targetKey: 'maya' }]);
  });

  it('becomes "-3 mots" when the leader has already finished', () => {
    const outcome = awardDueBonuses({ isEnabled: true, passage, checkpointsPassed: 2, racers: [racer('maya', 66, { isFinished: true }), racer('zoe', 1)] }, fog);

    expect(outcome.awards.map((award) => award.kind)).toEqual(['remove-words']);
  });

  it('keeps every text whole on the server and in every view', () => {
    const maya = '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b' as GuestId;
    const zoe = '1b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b' as GuestId;
    const startsAt = new Date(1_790_000_000_000);
    const row: RaceBonusRow = { guestId: zoe, botCharacter: null, checkpoint: 25, kind: 'fog', wordsRemoved: 0, targetGuestId: maya, targetBotCharacter: null, addedWords: null, awardedAt: new Date(startsAt.getTime() + 10_000) };
    const views = toBonusViews({ startsAt }, [row], new Map([[maya, 'maya'], [zoe, 'zoe']]));

    expect(views).toEqual([zoeFogsMaya]);
    expect(racerTextIn({ passage }, [row], maya)).toBe(passage);
    expect(memberText(passage, views, 'maya')).toBe(passage);
  });
});

describe('the leader\'s view under fog (BONUS-02, BONUS-03)', () => {
  it(`blurs the leader for ${fogMs} ms from the award on the server clock, then never again`, () => {
    expect(foggingBonus([zoeFogsMaya], 'maya', 9_999)).toBeUndefined();
    expect(foggingBonus([zoeFogsMaya], 'maya', 10_000)).toEqual(zoeFogsMaya);
    expect(foggingBonus([zoeFogsMaya], 'maya', 10_000 + fogMs - 1)).toEqual(zoeFogsMaya);
    expect(foggingBonus([zoeFogsMaya], 'maya', 10_000 + fogMs)).toBeUndefined();
    expect(foggingBonus([zoeFogsMaya], 'zoe', 11_000)).toBeUndefined();
  });

  it(`blurs the next ${foggedWords} words after the caret, never the character under it`, () => {
    const characters = passageCharacters(passage);
    const fogged = render('fr', createElement(RacePassage, { heading: 'Texte', passage, language: 'fr', characters, position: 3, isRejected: false, isFogged: true }));
    const current = /data-state="current"[^>]*>([^<]*)</.exec(fogged)?.[1];
    const blurred = /data-state="fogged" class="passage-fog">([^<]*)</.exec(fogged)?.[1];

    expect(current).toBe('c');
    expect(blurred).toBe('hat dort sous la grande');
    expect(foggedUpcoming(' la cuisine', 5)).toEqual({ fogged: ' la cuisine', clear: '' });
  });

  it('shows every character in place, so nothing shifts while fogged or after', () => {
    const characters = passageCharacters(passage);
    const props = { heading: 'Texte', passage, language: 'fr', characters, position: 12, isRejected: false } as const;

    expect(visibleText(render('fr', createElement(RacePassage, { ...props, isFogged: true })))).toBe(visibleText(render('fr', createElement(RacePassage, props))));
    expect(render('fr', createElement(RacePassage, { ...props, isFogged: false }))).not.toContain('passage-fog');
  });

  it('counts every keystroke typed under fog, and the leader finishes the same text', () => {
    const characters = passageCharacters(memberText(passage, [zoeFogsMaya], 'maya'));
    const typed = characters.reduce((state, character) => applyInput(state, characters, { inputType: 'insertText', data: character, isComposing: false }), untypedState);

    expect(typed.position).toBe(characters.length);
    expect(typed.keystrokes).toBe(characters.length);
    expect(typed.rejectedKeystrokes).toBe(0);
    expect(isPassageFinished(typed, characters)).toBe(true);
  });

  it('appears without animation under reduced motion', () => {
    const css = readFileSync(join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');

    expect(css).toMatch(/\.passage-fog \{[^}]*filter: blur\(/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ \.passage-fog \{ animation: none; \} \}/);
  });

  it.each([
    ['fr', `Brouillard ! Tes prochains mots sont flous pendant ${fogMs / 1000} secondes. Continue de taper.`],
    ['en', `Fog! Your next words are blurred for ${fogMs / 1000} seconds. Keep typing.`],
  ] as const)('in %s, tells the leader "%s" in the toast and the status region while the fog lasts', (locale, notice) => {
    const racers = racersWithLocalViewer(members, members[0]!.progress!, { passage, bonuses: [zoeFogsMaya] });
    const hinderedBy = leaderNoticeBonus([zoeFogsMaya], 'maya', 11_000);

    expect(hinderedBy).toEqual(zoeFogsMaya);
    expect(leaderNoticeBonus([zoeFogsMaya], 'maya', 10_000 + fogMs)).toBeUndefined();
    expect(render(locale, createElement(CatchUpBonusBanner, { bonus: undefined, hinderedBy }))).toContain(notice);
    expect(render(locale, createElement(RaceAnnouncements, { racers, announcedBonuses: announcedBonuses([zoeFogsMaya], 11_000), hinderedBy }))).toContain(`<p>${notice}</p>`);
  });

  it.each(['fr', 'en'] as const)('in %s, names "Brouillard" in the receiver\'s banner', (locale) => {
    const room = catalogs[locale].Room;

    expect(render(locale, createElement(CatchUpBonusBanner, { bonus: zoeFogsMaya }))).toContain(room.bonusBannerFog.replace('{bonus}', room.bonusFog));
  });
});

describe('the track announcement (BONUS-03)', () => {
  it.each(['fr', 'en'] as const)('in %s, shows "Brouillard" on the leader\'s line for everyone', (locale) => {
    const racers = racersWithLocalViewer(members, members[1]!.progress!, { passage, bonuses: [zoeFogsMaya] }).map((one) => ({ ...one, isViewer: one.memberKey === 'zoe' }));
    const roster = render(locale, createElement(RaceRoster, { roomId: 'room' as never, racers, clock: { elapsedMs: 11_000, viewerCorrectCharacters: 2 }, isReconnecting: false, removableKeys: new Set<string>(), announcedBonuses: trackBadges([zoeFogsMaya], 11_000) }));
    const mayaLine = /data-roster-member="maya".*?<\/li>/s.exec(roster)?.[0] ?? '';
    const zoeLine = /data-roster-member="zoe".*?<\/li>/s.exec(roster)?.[0] ?? '';

    expect(mayaLine).toContain(catalogs[locale].Room.bonusFog);
    expect(zoeLine).not.toContain('data-bonus-badge');
    expect(trackBadges([zoeFogsMaya], 10_000 + announcementMs).size).toBe(0);
  });
});

describe('results after a fog (BONUS-03)', () => {
  it.each(['fr', 'en'] as const)('in %s, lists "Brouillard" under the receiver\'s "Bonus reçus"', (locale) => {
    const result = { standing: 'ranked', outcome: 'finished', grossWpm: 40, rawWpm: 41, score: 40, accuracy: 1, errors: 0, finishMs: 30_000 } as const;
    const racers = members.map(({ memberKey, trainerName, avatarSeed, isViewer, partner, bot }) => ({ memberKey, trainerName, avatarSeed, isViewer, partner, bot }));
    const rows = resultsTableRows([{ ...result, memberKey: 'maya', place: 1 }, { ...result, memberKey: 'zoe', place: 2 }], racers, [zoeFogsMaya]);
    const cells = [...render(locale, createElement(ResultsTable, { rows })).matchAll(/<td data-bonuses="(\d)"[^>]*>([^<]*)<\/td>/g)].map((match) => match[2]);

    expect(cells).toEqual(['—', catalogs[locale].Room.bonusFog]);
  });
});

describe('nobody but the server sends fog (BONUS-01, COURSE-06)', () => {
  const report = { sequence: 3, position: 12, correctCharacters: 12, keystrokes: 12, rejectedKeystrokes: 0 };

  it.each([
    ['a fog kind', { ...report, kind: 'fog' }],
    ['a forged fog bonus', { ...report, bonus: { kind: 'fog', target: 'maya' } }],
    ['a fog target', { ...report, fogTarget: 'maya' }],
    ['a fog duration', { ...report, fogMs: 60_000 }],
  ])('refuses a progress report carrying %s', (_label, body) => {
    expect(progressReportRequestSchema.safeParse(body).success).toBe(false);
  });

  it('refuses a bonus switch that asks for fog', () => {
    expect(catchUpBonusesRequestSchema.safeParse({ enabled: true, kind: 'fog' }).success).toBe(false);
    expect(catchUpBonusesRequestSchema.safeParse({ enabled: true, targetKey: 'maya' }).success).toBe(false);
  });

  it('exposes no route that triggers fog', () => {
    const roomRoutes = readdirSync(join(process.cwd(), 'src', 'app', 'api', 'rooms', '[roomId]'));

    expect(roomRoutes.filter((name) => /fog|blur|bonus/u.test(name))).toEqual(['catch-up-bonuses']);
  });

  it.each([
    ['a numeric target', { ...zoeFogsMaya, targetKey: 7 }],
    ['no target', { memberKey: 'zoe', checkpoint: 25, kind: 'fog', awardedMs: 10_000 }],
    ['a checkpoint off the rule', { ...zoeFogsMaya, checkpoint: 10 }],
  ])('refuses a race view whose fog has %s', (_label, bonus) => {
    expect(parseRaceBonuses({ catchUpBonuses: true, bonuses: [bonus] })).toBeNull();
  });

  it('accepts a well-formed fog view', () => {
    expect(parseRaceBonuses({ catchUpBonuses: true, bonuses: [zoeFogsMaya] })?.bonuses).toEqual([zoeFogsMaya]);
  });
});
