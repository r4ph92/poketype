import { expect, test } from '@playwright/test';
import fr from '../../messages/fr.json';
import en from '../../messages/en.json';
import { enterAsGuest, uniqueName } from './support/guests';
import { expectNoAccessibilityViolations } from './support/axe';

for (const width of [375, 1440]) {
  test(`header and settings sheet at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1024 });
    await enterAsGuest(page, uniqueName('Alex '));
    await expect(page).toHaveTitle(fr.Metadata.playTitle);
    const settings = page.getByRole('button', { name: fr.Header.settings, exact: true });
    await expect(page.getByRole('group', { name: fr.LocaleSwitch.label, exact: true })).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 1440) {
      const boxes = await Promise.all([settings, page.getByRole('link', { name: fr.Header.tabs.trainer, exact: true }), page.getByRole('link', { name: fr.AccountBar.signUp, exact: true })].map((locator) => locator.boundingBox()));
      expect(Math.max(...boxes.map((box) => box!.y)) - Math.min(...boxes.map((box) => box!.y))).toBeLessThan(3);
    }
    await page.screenshot({ path: `test-results/header-${width}.png`, animations: 'disabled' });
    await settings.click();
    const dialog = page.getByRole('dialog', { name: fr.Header.settings });
    await expect(dialog).toBeVisible();
    await expectNoAccessibilityViolations(page);
    await page.screenshot({ path: `test-results/settings-${width}.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(settings).toBeFocused();
    await settings.click();
    await page.getByRole('button', { name: fr.LocaleSwitch.names.en, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveURL('/play');
    const englishDialog = page.getByRole('dialog', { name: en.Header.settings });
    if (!(await englishDialog.isVisible())) await page.getByRole('button', { name: en.Header.settings, exact: true }).click();
    await expect(page.getByRole('button', { name: en.LocaleSwitch.names.en, exact: true })).toHaveAttribute('aria-current', 'true');
    await page.getByRole('button', { name: en.Header.closeSettings }).click();
    await expect(englishDialog).not.toBeVisible();
  });
}

for (const path of ['/', '/login', '/signup', '/credits']) {
  test(`a visitor on ${path} sees only the wordmark, the settings and the account links`, async ({ page }) => {
    await page.goto(path);
    const banner = page.getByRole('banner');
    await expect(banner.getByRole('link', { name: fr.Header.wordmark })).toBeVisible();
    await expect(banner.getByRole('button', { name: fr.Header.settings, exact: true })).toBeVisible();
    await expect(banner.getByRole('link', { name: fr.AccountBar.logIn, exact: true })).toBeVisible();
    await expect(banner.getByRole('link', { name: fr.AccountBar.signUp, exact: true })).toBeVisible();
    await expect(banner.getByRole('navigation', { name: fr.Header.navLabel })).toHaveCount(0);
    for (const tab of Object.values(fr.Header.tabs)) await expect(banner.getByRole('link', { name: tab, exact: true })).toHaveCount(0);
  });
}

test('a guest keeps the full game header once in the game', async ({ page }) => {
  await enterAsGuest(page, uniqueName('Alex '));
  await expect(page.getByRole('banner').getByRole('navigation', { name: fr.Header.navLabel }).getByRole('link')).toHaveCount(Object.keys(fr.Header.tabs).length);
});
