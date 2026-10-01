import { expect, test } from '@playwright/test';
import { inspectGlyphs } from '../support/glyphs';
import { openState, pageStates } from '../support/pixel-states';

test.describe('French glyphs in both faces', () => {
  test('the race passage uses the reading face, which draws every French accent, ç and œ itself, each one character wide', async ({ browser }) => {
    const raceState = pageStates.find(({ name }) => name === 'race')!;
    const { page } = await openState(browser, raceState);
    const report = await inspectGlyphs(page, '#passage-heading + p');
    expect(report.family).toMatch(/Atkinson/);
    expect(report.fallbackGlyphs).toEqual([]);
    expect(report.unevenGlyphs).toEqual([]);
    await page.context().close();
  });

  test('while typing, the typed part and the current character use the reading face and draw every French glyph', async ({ browser }) => {
    const typingState = pageStates.find(({ name }) => name === 'race-typing')!;
    const { page } = await openState(browser, typingState);
    for (const segment of ['typed', 'current']) {
      const report = await inspectGlyphs(page, `#passage-heading + p [data-state="${segment}"]`);
      expect(report.family, segment).toMatch(/Atkinson/);
      expect(report.fallbackGlyphs, segment).toEqual([]);
      expect(report.unevenGlyphs, segment).toEqual([]);
    }
    await page.context().close();
  });

  test('the reading face draws every French accent, ç and œ itself, each one character wide', async ({ page }) => {
    await page.goto('/');
    const report = await inspectGlyphs(page, 'body');
    expect(report.family).toMatch(/Atkinson/);
    expect(report.fallbackGlyphs).toEqual([]);
    expect(report.unevenGlyphs).toEqual([]);
  });

  test('the pixel face draws every French accent, ç and œ itself', async ({ page }) => {
    await page.goto('/');
    const report = await inspectGlyphs(page, 'main h2');
    expect(report.family).toMatch(/Pixelify/);
    expect(report.fallbackGlyphs).toEqual([]);
  });
});
