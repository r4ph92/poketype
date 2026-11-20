import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { gameConfig } from '../../src/config/game';
import { removalRequestSchema } from '../../src/server/validation/room-schemas';

describe('a forged kick request', () => {
  it('names the target by memberKey only, so a client can never pick the host or slip in a guest id', () => {
    expect(removalRequestSchema.safeParse({ memberKey: '7c1d2e1a-0000-4000-8000-000000000000' }).success).toBe(true);
    expect(removalRequestSchema.safeParse({ memberKey: '7c1d2e1a-0000-4000-8000-000000000000', guestId: 'zoe' }).success).toBe(false);
    expect(removalRequestSchema.safeParse({ memberKey: '7c1d2e1a-0000-4000-8000-000000000000', hostGuestId: 'maya' }).success).toBe(false);
  });

  it('refuses a missing, empty, non-string or oversized memberKey', () => {
    for (const body of [{}, { memberKey: '' }, { memberKey: 123 }, { memberKey: null }, { memberKey: ['a'] }, { memberKey: 'x'.repeat(gameConfig.rooms.maxMemberKeyLength + 1) }, null, []]) {
      expect(removalRequestSchema.safeParse(body).success).toBe(false);
    }
  });
});

describe('the kick messages', () => {
  const kickKeys = ['kickPlayer', 'kickPlayerLabel', 'kickTitle', 'kickMessage', 'kickConfirm', 'kickPending', 'kickFailed', 'kickCancel', 'kickPanelHeading'] as const;

  it('exist in both locales and are translated, keeping the {name} placeholder where the French has it', () => {
    for (const key of kickKeys) {
      expect(en.Lobby[key], key).toBeTruthy();
      expect(en.Lobby[key], key).not.toBe(fr.Lobby[key]);
      expect(en.Lobby[key].includes('{name}'), key).toBe(fr.Lobby[key].includes('{name}'));
    }
  });

  it('tell the kicked player why, in English and in French, on every refusal screen', () => {
    expect(fr.Play.removedByHost).toBe('Tu as été expulsée de la salle.');
    expect(fr.Room.bannedHeading).toBe('Tu ne peux plus rejoindre cette salle');
    expect(fr.RoomAccess.errors.banned).toBe(fr.Room.bannedHeading);
    for (const text of [en.Play.removedByHost, en.Room.bannedHeading, en.Room.bannedMessage, en.RoomAccess.errors.banned]) {
      expect(text).toMatch(/^[\x20-\x7E]+$/);
    }
    expect(en.RoomAccess.errors.banned).toBe(en.Room.bannedHeading);
  });
});
