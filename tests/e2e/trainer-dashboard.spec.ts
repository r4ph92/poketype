import { expect, test } from '@playwright/test';
import fr from '../../messages/fr.json';
import { enterAsGuest, uniqueName } from './support/guests';
import { expectNoAccessibilityViolations } from './support/axe';

test('demo storage filters, inspects and equips a partner without persisting it', async ({ page }) => {
  await enterAsGuest(page, uniqueName('Alex '));
  await expect(page.getByText(fr.Trainer.demo, { exact: true })).toBeVisible();
  const partner = page.getByRole('region', { name: fr.Trainer.partner, exact: true });
  await expect(partner.getByRole('heading', { name: fr.Trainer.species['4'] })).toBeVisible();
  await page.getByRole('link', { name: fr.Header.tabs.collection, exact: true }).click();
  await expect(page).toHaveURL('/play/collection');
  const storage = page.getByRole('region', { name: fr.Trainer.storage, exact: true });
  await storage.getByRole('button', { name: fr.Trainer.types.water, exact: true }).click();
  await expect(storage.locator('button.pokemon-slot')).toHaveCount(2);
  await storage.getByRole('button', { name: fr.Trainer.inspect.replace('{name}', fr.Trainer.species['7']) }).click();
  await page.getByRole('button', { name: fr.Trainer.equip, exact: true }).click();
  await page.getByRole('link', { name: fr.Header.tabs.trainer, exact: true }).click();
  await expect(partner.getByRole('heading', { name: fr.Trainer.species['7'] })).toBeVisible();
  await expect(partner.getByText(fr.Trainer.level.replace('{level}', '12'), { exact: true }).first()).toBeVisible();
  await page.getByRole('link', { name: fr.Header.tabs.collection, exact: true }).click();
  await storage.getByRole('textbox', { name: fr.Trainer.search }).fill('introuvable');
  await expect(storage.getByText(fr.Trainer.noPokemon)).toBeVisible();
  await page.getByRole('link', { name: fr.Header.tabs.trainer, exact: true }).click();
  await expect(page).toHaveURL('/play');
  await page.reload();
  await expect(partner.getByRole('heading', { name: fr.Trainer.species['4'] })).toBeVisible();
});

test('practice opens as a keyboard-accessible modal and badges show their state', async ({ page }) => {
  await enterAsGuest(page, uniqueName('Alex '));
  await page.getByRole('button', { name: fr.Trainer.practice, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox').fill(fr.Trainer.practicePassage);
  await expect(dialog.getByText(fr.Trainer.practiceDone)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: `${fr.Trainer.badges.soul} — ${fr.Trainer.locked}` }).click();
  await expect(page.locator('.badge-caption')).toContainText(fr.Trainer.locked);
});

for (const width of [375, 1440]) {
  test(`trainer dashboard renders and passes accessibility at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1024 });
    await enterAsGuest(page, uniqueName('Alex '));
    await expect.poll(() => page.locator('img').evaluateAll((images) => images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page).toHaveTitle(fr.Metadata.playTitle);
    await expectNoAccessibilityViolations(page);
    await page.screenshot({ path: `test-results/trainer-dashboard-${width}.png`, fullPage: true, animations: 'disabled' });
    await page.screenshot({ path: `test-results/trainer-dashboard-${width}-viewport.png`, animations: 'disabled' });
  });
}


test('header tabs open separate views with one active tab and shared footer', async ({ page }) => {
  await enterAsGuest(page, uniqueName('Alex '));
  for (const [tab, path] of [['collection', '/play/collection'], ['race', '/play/race'], ['routes', '/play/routes'], ['trainer', '/play']] as const) {
    const link = page.getByRole('link', { name: fr.Header.tabs[tab], exact: true });
    await link.click();
    await expect(page).toHaveURL(path);
    await expect(link).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('nav [aria-current="page"]')).toHaveCount(1);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('region', { name: fr.Trainer.storage, exact: true })).toHaveCount(tab === 'collection' ? 1 : 0);
  }
  await page.goBack();
  await expect(page.getByRole('link', { name: fr.Header.tabs.routes, exact: true })).toHaveAttribute('aria-current', 'page');
  await page.goForward();
  await expect(page.getByRole('link', { name: fr.Header.tabs.trainer, exact: true })).toHaveAttribute('aria-current', 'page');
});

for (const width of [375, 1440]) {
  test(`collection view is accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1024 });
    await enterAsGuest(page, uniqueName('Alex '));
    await page.getByRole('link', { name: fr.Header.tabs.collection, exact: true }).click();
    await expect(page).toHaveTitle(fr.Header.tabs.collection);
    await expect.poll(() => page.locator('img').evaluateAll((images) => images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expectNoAccessibilityViolations(page);
    await page.screenshot({ path: `test-results/collection-${width}.png`, fullPage: true, animations: 'disabled' });
  });
}

test('direct collection entry requires a player session', async ({ page }) => {
  await page.goto('/play/collection');
  await expect(page).toHaveURL('/');
});
