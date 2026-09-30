import { describe, expect, it } from 'vitest';
import { acceptsNewMembers, isRoomOpen, isRoomPhase, roomPhases } from '../../src/domain/room-phase';

describe('room phase rules', () => {
  it.each(roomPhases.filter((phase) => phase !== 'closed'))('a room in %s is open', (phase) => {
    expect(isRoomOpen(phase)).toBe(true);
  });

  it('a closed or missing room is not open', () => {
    expect(isRoomOpen('closed')).toBe(false);
    expect(isRoomOpen(null)).toBe(false);
  });

  it('only a waiting room accepts new members', () => {
    expect(roomPhases.filter(acceptsNewMembers)).toEqual(['waiting']);
  });

  it('recognizes only the known phases', () => {
    expect(roomPhases.every(isRoomPhase)).toBe(true);
    expect(isRoomPhase('lobby')).toBe(false);
    expect(isRoomPhase(null)).toBe(false);
  });
});
