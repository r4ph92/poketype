import { expect, test } from '@playwright/test';
import { inspectGlyphs } from '../support/glyphs';

test.describe('French glyphs in both faces', () => {
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
