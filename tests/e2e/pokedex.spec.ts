import { expect, test } from '@playwright/test';
import fr from '../../messages/fr.json';
import { enterAsGuest, uniqueName } from './support/guests';
import { expectNoAccessibilityViolations } from './support/axe';
import { findGuestIdNamed, givePokemon } from './support/trainer';

const regionButton = (page: import('@playwright/test').Page, region: string) => page.getByRole('group', { name: fr.Pokedex.regions }).getByRole('button', { name: new RegExp(`^${region}`) });

for (const width of [375, 1440]) {
  test(`Pokédex and legendary goals at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1024 });
    await enterAsGuest(page, uniqueName('Dex '));
    await page.getByRole('link', { name: fr.Trainer.pokedexLink, exact: true }).click();
    await expect(page).toHaveURL('/play/pokedex');
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '1');
    await expect(page.getByRole('progressbar')).toHaveAttribute('max', '649');
    await expect(regionButton(page, fr.Regions.kanto)).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: fr.Pokedex.owned, exact: true }).click();
    await expect(page.locator('.pokedex-card')).toHaveCount(1);
    await page.getByRole('button', { name: fr.Pokedex.all, exact: true }).click();
    await expect(page).toHaveTitle(fr.Pokedex.title);
    await expect(page.locator('.pokedex-card')).toHaveCount(24);
    await page.getByRole('textbox', { name: fr.Pokedex.search }).fill(fr.Pokemon.charmander);
    await page.locator('.pokedex-card').click();
    await expect(page.locator('.pokedex-detail [data-species="charmander"]')).toHaveCount(1);
    await expect(page.locator('.pokedex-detail')).toContainText(fr.Trainer.level.replace('{level}', '1'));
    await page.getByRole('button', { name: fr.Pokedex.preview, exact: true }).click();
    await expect(page.locator('.pokedex-detail .pokemon-sheet')).toHaveCSS('animation-play-state', 'running');
    await page.getByRole('button', { name: fr.Pokedex.stopPreview, exact: true }).click();
    await page.getByRole('textbox', { name: fr.Pokedex.search }).fill('');
    await page.getByRole('button', { name: fr.Pokedex.legendary, exact: true }).click();
    await expect(page.locator('.pokedex-card')).toHaveCount(5);
    await expect(page.locator('.pokedex-card img')).toHaveCount(5);
    await expect(page.locator('.pokedex-card img').first()).toHaveCSS('filter', 'brightness(0)');
    await expect(page.locator('.pokedex-card').first()).toContainText('????');
    await page.locator('.pokedex-card').first().click();
    await expect(page.locator('#pokedex-detail-title')).toHaveText('????');
    await expect(page.locator('.pokedex-detail img')).toHaveCSS('filter', 'brightness(0)');
    await expect(page.locator('.pokedex-detail .pokemon-sheet')).toHaveCount(0);
    await expect(page.getByRole('button', { name: fr.Pokedex.preview, exact: true })).toHaveCount(0);
    await page.getByRole('textbox', { name: fr.Pokedex.search }).fill(fr.Pokemon.articuno);
    await expect(page.locator('.pokedex-card')).toHaveCount(0);
    await page.getByRole('textbox', { name: fr.Pokedex.search }).fill('');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expectNoAccessibilityViolations(page);
    await page.screenshot({ path: `test-results/pokedex-${width}.png`, fullPage: true, animations: 'disabled' });
    await page.getByRole('link', { name: fr.Pokedex.achievements, exact: true }).click();
    await expect(page).toHaveTitle(fr.Achievements.title);
    await expect(page.locator('.achievement-grid section')).toHaveCount(5);
    await expect(page.locator('.achievement-grid h2').first()).toHaveText('????');
    await expectNoAccessibilityViolations(page);
    await page.screenshot({ path: `test-results/achievements-${width}.png`, fullPage: true });
  });
}

test('the Pokédex groups the 649 species by region, with French names, legendaries and per-region progress', async ({ page }) => {
  const name = uniqueName('Dex ');
  await enterAsGuest(page, name);
  await givePokemon(await findGuestIdNamed(name), 152, 5);
  await page.goto('/play/pokedex');
  const regions = page.getByRole('group', { name: fr.Pokedex.regions });
  await expect(regions.getByRole('button')).toHaveText([fr.Regions.kanto, fr.Regions.johto, fr.Regions.hoenn, fr.Regions.sinnoh, fr.Regions.unova].map((region) => new RegExp(`^${region}`)));
  await expect(regionButton(page, fr.Regions.johto)).toContainText('1 / 100');
  await regionButton(page, fr.Regions.johto).click();
  await expect(regionButton(page, fr.Regions.johto)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.pokedex-card').first()).toContainText(fr.Pokemon.chikorita);
  await expect(page.locator('.pokedex-card').first()).toContainText('152');
  await page.getByRole('button', { name: fr.Pokedex.legendary, exact: true }).click();
  await expect(page.locator('.pokedex-card')).toHaveCount(6);
  await page.locator('.pokedex-card').first().click();
  await expect(page.locator('.pokedex-detail')).toContainText(fr.Pokedex.wildLegendaryUnlock);
  await regionButton(page, fr.Regions.unova).click();
  await expect(page.locator('.pokedex-card')).toHaveCount(13);
  await page.getByRole('button', { name: fr.Pokedex.all, exact: true }).click();
  await page.getByRole('textbox', { name: fr.Pokedex.search }).fill('Pikachu');
  await expect(page.getByRole('status').filter({ hasText: fr.Pokedex.empty.replace('{region}', fr.Regions.unova) })).toBeVisible();
  await expectNoAccessibilityViolations(page);
});
