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
    await expect(page.getByRole('group', { name: fr.LocaleSwitch.label })).not.toBeVisible();
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
