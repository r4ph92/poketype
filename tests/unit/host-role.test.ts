import { describe, expect, it } from 'vitest';
import { defaultHostRole, isHostRole, parseHostRole } from '../../src/domain/host-role';

describe('the host role', () => {
  it('knows the two roles and races by default', () => {
    expect(isHostRole('participant')).toBe(true);
    expect(isHostRole('spectator')).toBe(true);
    expect(defaultHostRole).toBe('participant');
  });

  it('reads a choice made at creation', () => {
    expect(parseHostRole('spectator')).toBe('spectator');
    expect(parseHostRole('participant')).toBe('participant');
  });

  it.each([undefined, null, '', 'Spectator', 'admin', 1, {}])('reads %s as a racing host', (value) => {
    expect(parseHostRole(value)).toBe('participant');
  });
});
