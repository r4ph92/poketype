import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { consentCookieName } from '../../src/features/consent/consent-level';
import { expectNoAccessibilityViolations } from './support/axe';
import { consentState, noConsentState } from './support/consent';
import { setLocaleCookie } from './support/locale';

const themeKey = 'poketype-theme';

test.use({ storageState: noConsentState });

const consentDialog = (page: Page, catalog = fr) => page.getByRole('dialog', { name: catalog.CookieConsent.title });
const choiceButton = (page: Page, name: string) => consentDialog(page).getByRole('button', { name, exact: true });

async function consentCookie(context: BrowserContext) {
  return (await context.cookies()).find(({ name }) => name === consentCookieName);
}

async function storedTheme(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), themeKey);
}

async function chooseDarkTheme(page: Page): Promise<void> {
  await page.getByRole('button', { name: fr.Header.settings, exact: true }).click();
  await page.getByRole('button', { name: fr.ThemeSwitch.names.dark, exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
}

test.describe('first visit', () => {
  test('shows the consent dialog with equal Accepter and Refuser, and Escape cannot dismiss it', async ({ page }) => {
    await page.goto('/');
    await expect(consentDialog(page)).toBeVisible();
    await expect(consentDialog(page).getByRole('heading', { name: fr.CookieConsent.title })).toBeFocused();
    const [accept, refuse] = await Promise.all([choiceButton(page, fr.CookieConsent.accept).boundingBox(), choiceButton(page, fr.CookieConsent.refuse).boundingBox()]);
    expect(Math.abs(accept!.height - refuse!.height)).toBeLessThan(1);
    expect(Math.abs(accept!.y - refuse!.y)).toBeLessThan(1);
    await expectNoAccessibilityViolations(page);

    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(consentDialog(page)).toBeVisible();
    expect(await consentCookie(page.context())).toBeUndefined();
  });

  test('keeps keyboard focus inside the dialog', async ({ page }) => {
    await page.goto('/');
    await expect(consentDialog(page)).toBeVisible();
    for (let step = 0; step < 6; step++) {
      await page.keyboard.press('Tab');
      const isInsideDialogOrChrome = await page.evaluate(() => document.activeElement === document.body || Boolean(document.activeElement?.closest('dialog[open]')));
      expect(isInsideDialogOrChrome).toBe(true);
    }
  });

  test('Accepter stores the choice for a year, closes the dialog for good and saves the theme', async ({ page }) => {
    await page.goto('/');
    await choiceButton(page, fr.CookieConsent.accept).click();
    await expect(consentDialog(page)).toBeHidden();
    const cookie = await consentCookie(page.context());
    expect(cookie).toMatchObject({ value: 'preferences', httpOnly: true, sameSite: 'Lax', path: '/' });
    const daysLeft = (cookie!.expires - Date.now() / 1000) / 86_400;
    expect(daysLeft).toBeGreaterThan(364);
    expect(daysLeft).toBeLessThan(366);

    await chooseDarkTheme(page);
    expect(await storedTheme(page)).toBe('dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.waitForLoadState('networkidle');
    await expect(consentDialog(page)).toBeHidden();
  });

  test('Refuser writes nothing optional: the theme works for the visit and an older saved theme is removed', async ({ page }) => {
    await page.goto('/credits');
    await page.evaluate((key) => localStorage.setItem(key, 'light'), themeKey);
    await choiceButton(page, fr.CookieConsent.refuse).click();
    await expect(consentDialog(page)).toBeHidden();
    expect((await consentCookie(page.context()))?.value).toBe('necessary');
    expect(await storedTheme(page)).toBeNull();

    await chooseDarkTheme(page);
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
    await page.reload();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
    await page.waitForLoadState('networkidle');
    await expect(consentDialog(page)).toBeHidden();
  });

  test('Personnaliser lists what is stored and saves the preferences switch', async ({ page }) => {
    await page.goto('/');
    const customize = choiceButton(page, fr.CookieConsent.customize);
    await expect(customize).toHaveAttribute('aria-expanded', 'false');
    await customize.click();
    await expect(customize).toHaveAttribute('aria-expanded', 'true');
    await expect(consentDialog(page).getByText(fr.CookieConsent.necessaryText)).toBeVisible();
    const preferences = consentDialog(page).getByRole('switch', { name: fr.CookieConsent.preferencesSwitch });
    await expect(preferences).not.toBeChecked();
    await expectNoAccessibilityViolations(page);
    await page.screenshot({ path: 'test-results/cookie-consent-details.png', animations: 'disabled' });
    await preferences.press('Space');
    await expect(preferences).toBeChecked();
    await choiceButton(page, fr.CookieConsent.save).click();
    await expect(consentDialog(page)).toBeHidden();
    expect((await consentCookie(page.context()))?.value).toBe('preferences');
  });

  test('speaks English when the interface is in English and fits a phone screen', async ({ page }) => {
    await setLocaleCookie(page.context(), 'en');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(consentDialog(page, en)).toBeVisible();
    await expect(consentDialog(page, en).getByRole('button', { name: en.CookieConsent.refuse, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expectNoAccessibilityViolations(page);
    await page.screenshot({ path: 'test-results/cookie-consent-375-en.png', animations: 'disabled' });
  });

  test('stays readable on the dark palette', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark', storageState: noConsentState });
    const page = await context.newPage();
    await page.goto('/');
    await choiceButton(page, fr.CookieConsent.customize).click();
    await consentDialog(page).getByRole('switch').check();
    await expectNoAccessibilityViolations(page);
    await page.screenshot({ path: 'test-results/cookie-consent-dark.png', animations: 'disabled' });
    await context.close();
  });
});

test.describe('changing the choice later', () => {
  test.use({ storageState: consentState('necessary') });

  test('the footer reopens the dialog, Escape closes it and focus returns to the footer', async ({ page }) => {
    await page.goto('/credits');
    await expect(consentDialog(page)).toBeHidden();
    const footerButton = page.getByRole('contentinfo').getByRole('button', { name: fr.CookieConsent.manage });
    await footerButton.click();
    await expect(consentDialog(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(consentDialog(page)).toBeHidden();
    await expect(footerButton).toBeFocused();

    await footerButton.click();
    await choiceButton(page, fr.CookieConsent.customize).click();
    await consentDialog(page).getByRole('switch', { name: fr.CookieConsent.preferencesSwitch }).check();
    await choiceButton(page, fr.CookieConsent.save).click();
    await expect(consentDialog(page)).toBeHidden();
    expect((await consentCookie(page.context()))?.value).toBe('preferences');
  });

  test('the gear settings reopen the dialog, and accepting saves the theme already chosen for the visit', async ({ page }) => {
    await page.goto('/');
    await chooseDarkTheme(page);
    expect(await storedTheme(page)).toBeNull();
    await page.getByRole('button', { name: fr.Header.settings, exact: true }).click();
    await page.getByRole('dialog', { name: fr.Header.settings }).getByRole('button', { name: fr.CookieConsent.manage }).click();
    await expect(page.getByRole('dialog', { name: fr.Header.settings })).toBeHidden();
    await expect(consentDialog(page)).toBeVisible();
    await choiceButton(page, fr.CookieConsent.accept).click();
    await expect(consentDialog(page)).toBeHidden();
    await expect.poll(() => storedTheme(page)).toBe('dark');
    await expect(page.getByRole('button', { name: fr.Header.settings, exact: true })).toBeFocused();
  });
});
