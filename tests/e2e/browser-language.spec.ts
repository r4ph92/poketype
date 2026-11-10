import { expect, test } from '@playwright/test';
import { localeCookieName, switchInterfaceTo } from './support/locale';

const htmlLang = /<html[^>]* lang="([a-z]+)"/;

// A browser context rewrites Accept-Language from its locale, so exact and malformed headers go through plain requests.
test.describe('the interface starts in the browser language', () => {
  for (const [header, locale] of [
    ['en-CA,en;q=0.9', 'en'],
    ['fr-CA', 'fr'],
    ['de-DE', 'fr'],
    ['<script>;q=x,,,;', 'fr'],
    [`${'de-DE;q=0.1,'.repeat(200)}en`, 'fr'],
  ] as const) {
    test(`"${header.slice(0, 40)}" without a saved choice renders the home page in ${locale}`, async ({ playwright, baseURL }) => {
      const request = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { 'Accept-Language': header } });
      const response = await request.get('/');
      expect(response.status()).toBe(200);
      expect((await response.text()).match(htmlLang)?.[1]).toBe(locale);
      await request.dispose();
    });
  }

  test('a saved French choice wins over an English browser', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-CA' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await switchInterfaceTo(page, 'fr');
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await context.close();
  });

  test('a saved English choice wins over a French browser', async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { 'Accept-Language': 'fr-CA', Cookie: `${localeCookieName}=en` },
    });
    expect((await (await request.get('/')).text()).match(htmlLang)?.[1]).toBe('en');
    await request.dispose();
  });
});
