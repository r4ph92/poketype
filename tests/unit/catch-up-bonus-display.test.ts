import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { gameConfig } from '../../src/config/game';
import type { CatchUpBonusView } from '../../src/domain/catch-up-bonus-view';
import type { RoomMemberView } from '../../src/domain/room-view';
import { CatchUpBonusBanner } from '../../src/features/race/CatchUpBonusBanner';
import { RaceAnnouncements } from '../../src/features/race/RaceAnnouncements';
import { announcedBonuses } from '../../src/features/race/race-bonus-announcements';
import { racersWithLocalViewer } from '../../src/features/race/racers';

type ProviderProps = ComponentProps<typeof NextIntlClientProvider>;

const catalogs = { fr, en } as const;
const passage = 'le chat dort sur le lit et rêve';
const zoeBonus: CatchUpBonusView = { memberKey: 'zoe', checkpoint: 25, kind: 'remove-words', wordsRemoved: 3, awardedMs: 10_000 };
const progress = { position: 0, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0, disconnected: false, abandonedOffline: false, lastSeenMs: 0 };
const members: RoomMemberView[] = [
  { memberKey: 'maya', trainerName: 'Maya', hasAccount: true, isHost: true, isViewer: true, partner: null, profile: null, progress, bot: null, avatarSeed: null },
  { memberKey: 'zoe', trainerName: 'Zoé', hasAccount: false, isHost: false, isViewer: false, partner: null, profile: null, progress: { ...progress, position: 12 }, bot: null, avatarSeed: null },
];

function render(locale: 'fr' | 'en', element: Parameters<typeof renderToStaticMarkup>[0]): string {
  return renderToStaticMarkup(createElement(NextIntlClientProvider, { locale, messages: { Room: catalogs[locale].Room }, timeZone: 'UTC' } as ProviderProps, element));
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
