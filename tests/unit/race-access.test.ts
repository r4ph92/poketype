import { describe, expect, it } from 'vitest';
import type { GuestId } from '../../src/domain/guest-id';
import { isRaceParticipant } from '../../src/domain/race-access';
import { pastRacePath } from '../../src/domain/race-history';

const maya = 'guest-maya' as GuestId;
const leo = 'guest-leo' as GuestId;
const nina = 'guest-nina' as GuestId;

describe('isRaceParticipant', () => {
  const participants = [{ guestId: maya }, { guestId: leo }];

  it('admits each participant', () => {
    expect(isRaceParticipant(participants, maya)).toBe(true);
    expect(isRaceParticipant(participants, leo)).toBe(true);
  });

  it('refuses a viewer who did not race', () => {
    expect(isRaceParticipant(participants, nina)).toBe(false);
  });

  it('refuses everyone on a race without participants', () => {
    expect(isRaceParticipant([], maya)).toBe(false);
  });
});

describe('pastRacePath', () => {
  it('points at the room-scoped results address', () => {
    expect(pastRacePath({ roomId: 'room-1', raceId: 'race-2' })).toBe('/rooms/room-1/races/race-2');
  });
});
