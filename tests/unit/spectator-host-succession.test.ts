import { describe, expect, it } from 'vitest';
import { parseRoomSnapshot } from '../../src/domain/room-view';

// The shape the server sends once a spectating host leaves mid-race or goes silent (host succession keeps her row, still a spectator).
const afterSpectatingHostHandedOver = {
  roomId: '2b0c7f4e-8a51-4c2e-9f63-1d7a5e3b9c80',
  code: 'ABCDEF',
  visibility: 'public',
  textSettings: { kind: 'random', errorMode: 'blocked', include: [], exclude: [], language: 'fr', wordCount: 40, complexity: 'easy', punctuation: true, accents: true, capitals: true, digits: false },
  timeLimitSeconds: 300,
  capacity: 30,
  phase: 'waiting',
  revision: 7,
  isHostAway: false,
  lobbyIdle: { idleAt: 1_790_000_600_000, closesAt: 1_790_000_900_000 },
  invitations: [],
  race: null,
  members: [
    { memberKey: 'maya', trainerName: 'Maya', avatarSeed: 1, hasAccount: true, isHost: false, isSpectator: true, isViewer: false, partner: 'charmander', profile: null, progress: null, bot: null },
    { memberKey: 'zoe', trainerName: 'Zoé', avatarSeed: 2, hasAccount: false, isHost: true, isSpectator: false, isViewer: true, partner: 'squirtle', profile: null, progress: null, bot: null },
  ],
};

describe('room snapshot after a spectating host hands the room over', () => {
  // A client that dropped this snapshot showed "Connexion perdue" for good (QA #144 blocker).
  it('still reaches the new host and the other players', () => {
    expect(parseRoomSnapshot(afterSpectatingHostHandedOver)).not.toBeNull();
  });
});
