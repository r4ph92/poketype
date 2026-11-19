import { describe, expect, it } from 'vitest';
import { parsePublicRoomFilter } from '../../src/server/validation/public-room-filter-schema';

describe('hostile values of the "langue" filter', () => {
  it('ignores injection, null bytes, padding, emoji, prototype keys and very long values', () => {
    const values = ['<script>alert(1)</script>', "en' OR 1=1--", '\u0000', 'en ', ' en', '🐉', 'français', '__proto__', 'constructor', 'toString', 'a'.repeat(6000)];
    for (const langue of values) expect(parsePublicRoomFilter({ langue })).toEqual({ language: undefined });
  });

  it('ignores a prototype-polluting key and an array under another name', () => {
    expect(parsePublicRoomFilter(JSON.parse('{"__proto__": {"langue": "en"}}'))).toEqual({ language: undefined });
    expect(parsePublicRoomFilter({ 'langue[]': 'en' })).toEqual({ language: undefined });
  });
});
