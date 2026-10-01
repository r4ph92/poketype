import { expect, type BrowserContext, type Page } from '@playwright/test';
import en from '../../../messages/en.json';
import fr from '../../../messages/fr.json';

export const localeCookieName = 'poketype_locale';

export function localeButton(page: Page, locale: 'fr' | 'en') {
  return page.getByRole('button', { name: fr.LocaleSwitch.names[locale], exact: true });
}

export async function openLanguageSettings(page: Page): Promise<void> {
  if (await localeButton(page, 'en').isVisible()) return;
  const current = await page.locator('html').getAttribute('lang');
  await page.getByRole('button', { name: current === 'en' ? en.Header.settings : fr.Header.settings, exact: true }).click();
}

export async function switchInterfaceTo(page: Page, locale: 'fr' | 'en'): Promise<void> {
  await openLanguageSettings(page);
  await localeButton(page, locale).click();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  if (await page.getByRole('dialog').isVisible()) await page.keyboard.press('Escape');
}

export async function localeCookie(context: BrowserContext) {
  return (await context.cookies()).find(({ name }) => name === localeCookieName);
}

export async function setLocaleCookie(context: BrowserContext, value: string): Promise<void> {
  await context.addCookies([{ name: localeCookieName, value, domain: 'localhost', path: '/' }]);
}

export { en, fr };

export function noticeLines(footer: typeof fr.Footer): string[] {
  return [footer.notice, footer.rights, footer.affiliation];
}
