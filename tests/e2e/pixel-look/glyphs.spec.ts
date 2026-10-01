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
