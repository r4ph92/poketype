import type { Page } from '@playwright/test';

export const frenchGlyphs = 'àâçéèêëîïôùûüœÀÂÇÉÈÊËÎÏÔÙÛÜŒ«»’';

export type GlyphReport = { family: string; fallbackGlyphs: string[]; unevenGlyphs: string[] };

// A glyph drawn by the web font looks the same whatever generic family follows it; a missing glyph falls back to serif or sans-serif and differs.
export async function inspectGlyphs(page: Page, selector: string): Promise<GlyphReport> {
  return page.evaluate(
    async ({ selector, glyphs }) => {
      const family = getComputedStyle(document.querySelector(selector)!).fontFamily.split(',')[0]!.trim().replace(/^["']|["']$/g, '');
      await document.fonts.load(`40px "${family}"`, glyphs);
      const canvas = document.createElement('canvas');
      canvas.width = 80;
      canvas.height = 80;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      const draw = (glyph: string, generic: string) => {
        context.clearRect(0, 0, 80, 80);
        context.font = `40px "${family}", ${generic}`;
        context.fillText(glyph, 16, 56);
        return context.getImageData(0, 0, 80, 80).data.join(',');
      };
      const advance = (glyph: string) => {
        context.font = `40px "${family}", monospace`;
        return context.measureText(glyph).width;
      };
      const characters = [...glyphs];
      return {
        family,
        fallbackGlyphs: characters.filter((glyph) => draw(glyph, 'serif') !== draw(glyph, 'sans-serif')),
        unevenGlyphs: characters.filter((glyph) => advance(glyph) !== advance('0')),
      };
    },
    { selector, glyphs: frenchGlyphs },
  );
}
