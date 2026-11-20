import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { gameConfig } from '../../src/config/game';
import type { CatchUpBonusView } from '../../src/domain/catch-up-bonus-view';
import type { RoomId } from '../../src/domain/room-id';
import type { RoomMemberView } from '../../src/domain/room-view';
import { ProgressBadge, type BadgeVariant } from '../../src/components/pixel/ProgressBadge';
import { CatchUpBonusBanner } from '../../src/features/race/CatchUpBonusBanner';
import { RaceRoster } from '../../src/features/race/RaceRoster';
import { RaceAnnouncements } from '../../src/features/race/RaceAnnouncements';
import { announcedBonuses } from '../../src/features/race/race-bonus-announcements';
import { racersWithLocalViewer } from '../../src/features/race/racers';
import { contrastRatio, themeColor, themes } from './support/theme-contrast';

type ProviderProps = ComponentProps<typeof NextIntlClientProvider>;

const catalogs = { fr, en } as const;
const passage = 'le chat dort sur le lit et rêve';
const zoeBonus: CatchUpBonusView = { memberKey: 'zoe', checkpoint: 25, kind: 'remove-words', wordsRemoved: 3, awardedMs: 10_000 };
const progress = { position: 0, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0, disconnected: false, abandonedOffline: false, lastSeenMs: 0 };
const members: RoomMemberView[] = [
  { memberKey: 'maya', trainerName: 'Maya', hasAccount: true, isHost: true, isSpectator: false, isViewer: true, partner: null, profile: null, progress, bot: null, avatarSeed: null },
  { memberKey: 'zoe', trainerName: 'Zoé', hasAccount: false, isHost: false, isSpectator: false, isViewer: false, partner: null, profile: null, progress: { ...progress, position: 12 }, bot: null, avatarSeed: null },
];

function render(locale: 'fr' | 'en', element: Parameters<typeof renderToStaticMarkup>[0]): string {
  return renderToStaticMarkup(createElement(NextIntlClientProvider, { locale, messages: { Room: catalogs[locale].Room, Bots: catalogs[locale].Bots }, timeZone: 'UTC' } as ProviderProps, element));
}

describe('announcing a catch-up bonus (BONUS-03)', () => {
  it('announces a bonus from the moment it fires for the configured time, the latest per racer', () => {
    const later = { ...zoeBonus, checkpoint: 50 as const, awardedMs: 12_000 };
    expect(announcedBonuses([zoeBonus], 9_999).size).toBe(0);
    expect(announcedBonuses([zoeBonus], 10_000).get('zoe')).toEqual(zoeBonus);
    expect(announcedBonuses([zoeBonus], 10_000 + gameConfig.catchUpBonuses.announcementMs).size).toBe(0);
    expect(announcedBonuses([zoeBonus, later], 12_500).get('zoe')).toEqual(later);
    expect(announcedBonuses([zoeBonus], null).size).toBe(0);
  });

  it.each(['fr', 'en'] as const)('in %s, names the bonus in the receiver\'s banner', (locale) => {
    const room = catalogs[locale].Room;
    expect(render(locale, createElement(CatchUpBonusBanner, { bonus: zoeBonus }))).toContain(room.bonusBanner.replace('{bonus}', room.bonusRemoveWords));
    expect(render(locale, createElement(CatchUpBonusBanner, { bonus: undefined }))).toBe('');
  });

  it.each(['fr', 'en'] as const)('in %s, tells every other racer who got which bonus through the status region', (locale) => {
    const room = catalogs[locale].Room;
    const racers = racersWithLocalViewer(members, progress, { passage, bonuses: [zoeBonus] });
    const html = render(locale, createElement(RaceAnnouncements, { racers, announcedBonuses: announcedBonuses([zoeBonus], 11_000) }));
    expect(html).toContain(room.bonusReceived.replace('{name}', 'Zoé').replace('{bonus}', room.bonusRemoveWords));
  });
});

describe('the receiver\'s banner (BONUS-03)', () => {
  it('draws the receiver\'s banner as a fixed toast, so no screen height hides it and the passage never moves', () => {
    const banner = render('fr', createElement(CatchUpBonusBanner, { bonus: zoeBonus }));
    const toastRule = readFileSync(join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').match(/\.bonus-toast \{([^}]*)\}/)![1]!;

    expect(banner).toMatch(/^<div class="bonus-toast"/);
    expect(toastRule).toContain('position: fixed');
  });
});

describe('the bonus badge on the roster (BONUS-03)', () => {
  const badgeColors = (variant: BadgeVariant): { text: string; background: string } => {
    const classes = renderToStaticMarkup(createElement(ProgressBadge, { variant } as ComponentProps<typeof ProgressBadge>, 'x')).match(/class="([^"]+)"/)![1]!.split(' ');
    const colorOf = (prefix: string) => classes.find((name) => name.startsWith(prefix) && name !== 'text-sm')!.slice(prefix.length);
    return { text: colorOf('text-'), background: colorOf('bg-') };
  };

  it.each(['fr', 'en'] as const)('in %s, shows the short bonus name on one line beside the racer', (locale) => {
    const racers = racersWithLocalViewer(members, progress, { passage, bonuses: [zoeBonus] });
    const roster = { roomId: 'room' as RoomId, racers, clock: { elapsedMs: 11_000, viewerCorrectCharacters: 0 }, isReconnecting: false, removableKeys: new Set<string>(), announcedBonuses: announcedBonuses([zoeBonus], 11_000) };
    const zoeRow = render(locale, createElement(RaceRoster, roster)).match(/<li[^>]*data-roster-member="zoe".*?<\/li>/)![0];
    const badge = zoeRow.match(/<span data-bonus-badge="true" class="([^"]*)">(.*?)<\/span><\/span>/)!;

    expect(badge[1]).toContain('whitespace-nowrap');
    expect(badge[2]).toMatch(new RegExp(`>${catalogs[locale].Room.bonusRemoveWords}$`));
  });

  it.each(themes)('keeps its small text at 4.5:1 or better in the %s theme', (theme) => {
    const { text, background } = badgeColors('bonus');
    expect(contrastRatio(themeColor(text, theme), themeColor(background, theme))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('progress on a shortened text (BONUS-04)', () => {
  it('measures each racer on their own text and finishes them at its end', () => {
    const racers = racersWithLocalViewer(members, progress, { passage, bonuses: [zoeBonus] });
    const zoe = racers.find((racer) => racer.memberKey === 'zoe')!;
    const maya = racers.find((racer) => racer.memberKey === 'maya')!;

    expect(zoe.textLength).toBe('le chat dort sur le'.length);
    expect(zoe.isFinished).toBe(false);
    expect(maya.textLength).toBe(passage.length);
    expect(racersWithLocalViewer([{ ...members[1]!, progress: { ...progress, position: 19 } }], progress, { passage, bonuses: [zoeBonus] })[0]!.isFinished).toBe(true);
  });
});
