import { describe, expect, it } from 'vitest';
import { prePaintThemeScript } from '../../src/features/theme/pre-paint-script';

function runScript(storage: { getItem: (key: string) => string | null }): string | undefined {
  const attributes: Record<string, string> = {};
  const document = { documentElement: { setAttribute: (name: string, value: string) => (attributes[name] = value) } };
  new Function('localStorage', 'document', prePaintThemeScript)(storage, document);
  return attributes['data-theme'];
}

describe('the pre-paint theme script', () => {
  it('applies a stored light or dark choice', () => {
    expect(runScript({ getItem: () => 'dark' })).toBe('dark');
    expect(runScript({ getItem: () => 'light' })).toBe('light');
  });

  it('leaves the system setting in charge for nothing stored or an unknown value', () => {
    expect(runScript({ getItem: () => null })).toBeUndefined();
    expect(runScript({ getItem: () => 'purple' })).toBeUndefined();
    expect(runScript({ getItem: () => 'system' })).toBeUndefined();
  });

  it('does not throw when storage is blocked', () => {
    const blocked = {
      getItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
    };
    expect(runScript(blocked)).toBeUndefined();
  });
});
