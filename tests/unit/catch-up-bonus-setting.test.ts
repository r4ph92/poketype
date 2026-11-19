import { describe, expect, it } from 'vitest';
import { parseRoomSnapshot } from '../../src/domain/room-view';
import { defaultTextSettings } from '../../src/domain/text-settings';
import { catchUpBonusesRequestSchema } from '../../src/server/validation/room-schemas';

const waitingRoom = {
  roomId: '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b',
  code: 'K7M2QX',
  visibility: 'public',
  textSettings: defaultTextSettings('fr'),
  timeLimitSeconds: null,
  catchUpBonuses: true,
  capacity: 30,
  phase: 'waiting',
  revision: 2,
  members: [{ memberKey: 'a', trainerName: 'Maya', hasAccount: false, isHost: true, isViewer: true, partner: null, profile: null, progress: null, bot: null, avatarSeed: null }],
  race: null,
  lobbyIdle: { idleAt: 1_790_000_300_000, closesAt: 1_790_000_600_000 },
  isHostAway: false,
  invitations: [],
};

describe('the catch-up bonus switch (CONF-09)', () => {
  it('accepts only a boolean named enabled', () => {
    expect(catchUpBonusesRequestSchema.safeParse({ enabled: true }).success).toBe(true);
    expect(catchUpBonusesRequestSchema.safeParse({ enabled: false }).success).toBe(true);
  });

  it.each([
    ['a string', { enabled: 'true' }],
    ['a number', { enabled: 1 }],
    ['null', { enabled: null }],
    ['no value', {}],
    ['an extra field', { enabled: true, roomId: 'other' }],
    ['a forged bonus', { enabled: true, bonus: { racer: 'me', kind: 'remove-words' } }],
  ])('refuses %s', (_label, body) => {
    expect(catchUpBonusesRequestSchema.safeParse(body).success).toBe(false);
  });

  it('reaches every member with the room snapshot, and a snapshot without it is malformed', () => {
    expect(parseRoomSnapshot(waitingRoom)?.catchUpBonuses).toBe(true);
    expect(parseRoomSnapshot({ ...waitingRoom, catchUpBonuses: undefined })).toBeNull();
    expect(parseRoomSnapshot({ ...waitingRoom, catchUpBonuses: 'yes' })).toBeNull();
  });
});
