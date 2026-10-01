import type { Page } from '@playwright/test';

export const frenchGlyphs = 'àâçéèêëîïôùûüœÀÂÇÉÈÊËÎÏÔÙÛÜŒ«»’';

export type GlyphReport = { family: string; fallbackGlyphs: string[]; unevenGlyphs: string[] };

async function loadedFamily(page: Page, selector: string): Promise<string> {
  return page.evaluate(
    async ({ selector, glyphs }) => {
      const family = getComputedStyle(document.querySelector(selector)!).fontFamily.split(',')[0]!.trim().replace(/^["']|["']$/g, '');
      await document.fonts.load(`40px "${family}"`, glyphs);
      return family;
    },
    { selector, glyphs: frenchGlyphs },
  );
}

// A glyph drawn by the web font looks the same whatever generic family follows it; a missing glyph falls back to serif or sans-serif and differs.
async function glyphsDrawnByFallback(page: Page, family: string): Promise<string[]> {
  return page.evaluate(
    ({ family, glyphs }) => {
      const context = Object.assign(document.createElement('canvas'), { width: 80, height: 80 }).getContext('2d', { willReadFrequently: true })!;
      const draw = (glyph: string, generic: string) => {
        context.clearRect(0, 0, 80, 80);
        context.font = `40px "${family}", ${generic}`;
        context.fillText(glyph, 16, 56);
        return context.getImageData(0, 0, 80, 80).data.join(',');
      };
      return [...glyphs].filter((glyph) => draw(glyph, 'serif') !== draw(glyph, 'sans-serif'));
    },
    { family, glyphs: frenchGlyphs },
  );
}

async function glyphsWiderOrNarrowerThanZero(page: Page, family: string): Promise<string[]> {
  return page.evaluate(
    ({ family, glyphs }) => {
      const context = document.createElement('canvas').getContext('2d')!;
      context.font = `40px "${family}", monospace`;
      const zeroWidth = context.measureText('0').width;
      return [...glyphs].filter((glyph) => context.measureText(glyph).width !== zeroWidth);
    },
    { family, glyphs: frenchGlyphs },
  );
}

export async function inspectGlyphs(page: Page, selector: string): Promise<GlyphReport> {
  const family = await loadedFamily(page, selector);
  return { family, fallbackGlyphs: await glyphsDrawnByFallback(page, family), unevenGlyphs: await glyphsWiderOrNarrowerThanZero(page, family) };
}
