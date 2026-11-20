import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { reserveBottomSpace, reservedBottomSpace } from '../../src/components/pixel/use-reserved-bottom-space';

function styled() {
  return { style: { scrollPaddingBottom: '', paddingBottom: '' } };
}

function sourceOf(...path: string[]): string {
  return readFileSync(join(process.cwd(), 'src', ...path), 'utf8');
}

describe('a fixed toast never hides a focused control (WCAG 2.4.11)', () => {
  it('keeps the toast height and its margins free under the page, and gives the room back when it closes', () => {
    const root = styled();
    const body = styled();

    reserveBottomSpace(root, body, reservedBottomSpace(112));
    expect(root.style.scrollPaddingBottom).toBe('144px');
    expect(body.style.paddingBottom).toBe('144px');

    reserveBottomSpace(root, body, '');
    expect(root.style).toEqual({ scrollPaddingBottom: '', paddingBottom: '' });
    expect(body.style).toEqual({ scrollPaddingBottom: '', paddingBottom: '' });
  });

  it.each([
    ['the catch-up bonus toast', ['features', 'race', 'CatchUpBonusBanner.tsx']],
    ['the page toast', ['components', 'pixel', 'Toast.tsx']],
  ])('reserves that room while %s shows', (_label, path) => {
    expect(sourceOf(...path)).toMatch(/useReservedBottomSpace\(/);
  });
});
