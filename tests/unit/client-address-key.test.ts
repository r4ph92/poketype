import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { clientAddressKey } from '../../src/server/http/client-address-key';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

describe('clientAddressKey', () => {
  it('hashes an IPv4 address, so the address itself is never stored', () => {
    expect(clientAddressKey('203.0.113.7')).toBe(sha256('203.0.113.7'));
  });

  it('hashes an IPv6 address the same whatever its case or surrounding spaces', () => {
    expect(clientAddressKey(' 2001:DB8::1 ')).toBe(sha256('2001:db8::1'));
  });

  it('gives different addresses different keys', () => {
    expect(clientAddressKey('203.0.113.7')).not.toBe(clientAddressKey('203.0.113.8'));
  });

  it.each([null, '', '   ', 'unknown', '203.0.113.7, 10.0.0.1', '999.0.0.1', `1.1.1.1${' '.repeat(50)}x`])('has no key for %j', (reported) => {
    expect(clientAddressKey(reported)).toBeNull();
  });
});
