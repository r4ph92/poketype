import { expect, type Page } from '@playwright/test';
import { withTestDatabase } from './guests';

// The element that draws a Pokémon: the animated frame, the still artwork, or the cropped race portrait.
const drawnSprites = '[data-species] .pokemon-frame, [data-species].pokemon-still img, .race-pokemon-portrait, img[src*="/sprites/pokemon/front/"]';

// Fails for every drawn Pokémon that a hiding ancestor, its own stage or the viewport cuts off; returns how many it checked.
export async function expectNoSpriteClipping(page: Page, expectedAtLeast = 1): Promise<void> {
  const report = await page.evaluate((selector) => {
    const hides = (value: string) => value === 'hidden' || value === 'clip';
    const cuts: string[] = [];
    let checked = 0;
    for (const sprite of document.querySelectorAll(selector)) {
      const box = sprite.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      checked += 1;
      const name = `${sprite.closest('[data-species]')?.getAttribute('data-species') ?? sprite.getAttribute('src') ?? sprite.getAttribute('class')} in ${sprite.parentElement?.className}`;
      if (box.left < -0.5 || box.right > innerWidth + 0.5) cuts.push(`${name}: outside the viewport`);
      const stage = sprite.closest('.pokemon-stage');
      const bounds = stage && stage !== sprite ? stage.getBoundingClientRect() : null;
      if (bounds && (box.left < bounds.left - 0.5 || box.right > bounds.right + 0.5 || box.top < bounds.top - 0.5 || box.bottom > bounds.bottom + 0.5)) cuts.push(`${name}: outside its stage`);
      for (let ancestor = sprite.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        const around = ancestor.getBoundingClientRect();
        const cutsX = hides(style.overflowX) && (box.left < around.left - 0.5 || box.right > around.right + 0.5);
        const cutsY = hides(style.overflowY) && (box.top < around.top - 0.5 || box.bottom > around.bottom + 0.5);
        if (cutsX || cutsY) cuts.push(`${name}: clipped by .${ancestor.className}`);
      }
    }
    return { checked, cuts };
  }, drawnSprites);
  expect(report.cuts).toEqual([]);
  expect(report.checked).toBeGreaterThanOrEqual(expectedAtLeast);
}

// The player's partner becomes the one Pokémon of that species, replacing any earlier partner.
export async function setPartnerOf(trainerName: string, dex: number): Promise<void> {
  await withTestDatabase(async (sql) => {
    await sql`update owned_pokemon set is_partner = false where guest_id in (select id from guests where trainer_name = ${trainerName})`;
    await sql`insert into owned_pokemon (guest_id, dex, level, is_partner) select id, ${dex}, 1, true from guests where trainer_name = ${trainerName}`;
  });
}
