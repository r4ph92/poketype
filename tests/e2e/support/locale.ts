import { expect, type BrowserContext, type Page } from '@playwright/test';
import en from '../../../messages/en.json';
import fr from '../../../messages/fr.json';

export const localeCookieName = 'poketype_locale';

export function localeButton(page: Page, locale: 'fr' | 'en') {
  return page.getByRole('button', { name: fr.LocaleSwitch.names[locale], exact: true });
}

export async function switchInterfaceTo(page: Page, locale: 'fr' | 'en'): Promise<void> {
  await localeButton(page, locale).click();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
}

export async function localeCookie(context: BrowserContext) {
  return (await context.cookies()).find(({ name }) => name === localeCookieName);
}

export async function setLocaleCookie(context: BrowserContext, value: string): Promise<void> {
  await context.addCookies([{ name: localeCookieName, value, domain: 'localhost', path: '/' }]);
}

export { en, fr };
