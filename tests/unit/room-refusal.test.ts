import { describe, expect, it } from 'vitest';
import { parseRaceId } from '../../src/domain/race';
import { raceResultsPath, type RoomId } from '../../src/domain/room-id';
import { isRemovedAfterAbandon, removedAfterAbandon } from '../../src/domain/room-refusal';

const roomId = '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b' as RoomId;
const raceId = '7a1d2e3f-2f6a-4d1e-9c3b-0b8f5e4c4a5b';

describe('removed after abandoning', () => {
  it('recognizes the body the snapshot sends a removed abandoner', () => {
    expect(isRemovedAfterAbandon(JSON.parse(JSON.stringify(removedAfterAbandon)))).toBe(true);
  });

  it.each([null, {}, { reason: 'idle' }, ['abandoned'], 'abandoned'])('reads %j as a plain refusal', (body) => {
    expect(isRemovedAfterAbandon(body)).toBe(false);
  });
});

describe('a past race address', () => {
  it('nests the race under its room', () => {
    expect(raceResultsPath(roomId, raceId)).toBe(`/rooms/${roomId}/races/${raceId}`);
  });

  it('accepts only a canonical race id', () => {
    expect(parseRaceId(raceId)).toBe(raceId);
    expect(parseRaceId(raceId.toUpperCase())).toBeNull();
    expect(parseRaceId(`${raceId}/../x`)).toBeNull();
  });
});
