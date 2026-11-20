import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { botMemberKey } from '../../src/domain/bot-member';
import type { BotCharacterId } from '../../src/assets/bot-characters';
import { memberText } from '../../src/domain/catch-up-bonus-view';
import type { CatchUpBonusView } from '../../src/domain/catch-up-bonus-view';
import type { GuestId } from '../../src/domain/guest-id';
import { foggedUpcoming } from '../../src/features/race/passage-segments';
import { foggingBonus, leaderNoticeBonus, trackBadges } from '../../src/features/race/race-bonus-announcements';
import { racerTextIn, toBonusViews, type RaceBonusRow } from '../../src/server/rooms/race-bonuses';

const passage = 'le chat dort sous la grande table.';
const addedWords = 'pomme rouge vite';
const { fogMs, foggedWords } = gameConfig.catchUpBonuses;
const maya = '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b' as GuestId;
const zoe = '1b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b' as GuestId;
const brock = 'brock' as BotCharacterId;
const startsAt = new Date(1_790_000_000_000);
const awardedAt = new Date(startsAt.getTime() + 10_000);
const memberKeys = new Map([[maya, 'maya'], [zoe, 'zoe']]);

const brockLengthensMaya: RaceBonusRow = { guestId: null, botCharacter: brock, checkpoint: 50, kind: 'add-words', wordsRemoved: 0, targetGuestId: maya, targetBotCharacter: null, addedWords, awardedAt };
const zoeFogsMaya: RaceBonusRow = { guestId: zoe, botCharacter: null, checkpoint: 50, kind: 'fog', wordsRemoved: 0, targetGuestId: maya, targetBotCharacter: null, addedWords: null, awardedAt };

describe('a fog and a "+3 mots" on the same leader at one checkpoint', () => {
  const views = toBonusViews({ startsAt }, [brockLengthensMaya, zoeFogsMaya], memberKeys);

  it('lengthens the leader text once on the server and in every view, the fog adding nothing', () => {
    expect(racerTextIn({ passage }, [brockLengthensMaya, zoeFogsMaya], maya)).toBe(`${passage} ${addedWords}`);
    expect(memberText(passage, views, 'maya')).toBe(`${passage} ${addedWords}`);
    expect(memberText(passage, views, 'zoe')).toBe(passage);
  });

  it('blurs the leader while the fog lasts', () => {
    expect(foggingBonus(views, 'maya', 10_000 + fogMs - 1)?.kind).toBe('fog');
    expect(foggingBonus(views, 'maya', 10_000 + fogMs)).toBeUndefined();
  });

  it('puts the fog badge on the leader line and the "+3 mots" badge on the bot line', () => {
    const badges = trackBadges(views, 10_000);

    expect(badges.get('maya')?.kind).toBe('fog');
    expect(badges.get(botMemberKey(brock))?.kind).toBe('add-words');
    expect(badges.has('zoe')).toBe(false);
  });
});

describe('a fog awarded near the end of the leader text', () => {
  it('blurs only the words left, and nothing once the text is typed', () => {
    expect(foggedUpcoming('ert', foggedWords)).toEqual({ fogged: 'ert', clear: '' });
    expect(foggedUpcoming(' vert', foggedWords)).toEqual({ fogged: ' vert', clear: '' });
    expect(foggedUpcoming('', foggedWords)).toEqual({ fogged: '', clear: '' });
  });
});

describe('a fog whose leader left the room', () => {
  const leftLeader: CatchUpBonusView = { memberKey: 'zoe', checkpoint: 25, kind: 'fog', targetKey: null, awardedMs: 10_000 };

  it('blurs nobody, tells nobody they are fogged and shows no badge', () => {
    expect(foggingBonus([leftLeader], 'zoe', 10_500)).toBeUndefined();
    expect(leaderNoticeBonus([leftLeader], 'zoe', 10_500)).toBeUndefined();
    expect(trackBadges([leftLeader], 10_500).size).toBe(0);
  });
});
