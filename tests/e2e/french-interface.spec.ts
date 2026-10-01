import { expect, test } from '@playwright/test';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { enterAsGuest, submitTrainerName, uniqueName } from './support/guests';
import { noticeLines } from './support/locale';

test.describe('French interface from the catalog', () => {
  test('every visible string on the home page is a French catalog value, English only in the footer block', async ({ page }) => {
    await page.goto('/');
    await expectEveryVisibleStringFromCatalog(page);
  });

  test('every visible string on the home page with a validation error is a French catalog value', async ({ page }) => {
    await submitTrainerName(page, 'A');
    await expect(page.locator('#trainer-name-error')).toBeVisible();
    await expectEveryVisibleStringFromCatalog(page);
  });

  test('every visible string on the play page is a French catalog value', async ({ page }) => {
    await enterAsGuest(page, uniqueName());
    await expectEveryVisibleStringFromCatalog(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('every visible string on the 404 page is a French catalog value, English only in the footer block', async ({ page }) => {
    await page.goto('/nimporte-quoi');
    await expectEveryVisibleStringFromCatalog(page);
    await expect(page).toHaveTitle(fr.Metadata.notFoundTitle);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('a browser asking for English with no saved choice still gets the French interface', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US', extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' } });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.Home.title);
    await expect(page.getByText(fr.Home.welcome)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await context.close();
  });
});

test.describe('footer on every page', () => {
  for (const path of ['/', '/nimporte-quoi', '/un/chemin/profond']) {
    test(`${path} has exactly one footer carrying the full notice in French and English`, async ({ page }) => {
      await page.goto(path);
      const footer = page.getByRole('contentinfo');
      await expect(footer).toHaveCount(1);
      for (const [locale, messages] of [['fr', fr.Footer], ['en', en.Footer]] as const) {
        const block = footer.locator(`[lang="${locale}"]`);
        await expect(block).toHaveCount(1);
        await expect(block).toBeVisible();
        for (const line of noticeLines(messages)) {
          await expect(block).toContainText(line);
        }
      }
      await expect(footer.getByRole('link', { name: fr.Footer.credits })).toHaveAttribute('href', '/credits');
    });
  }
});

test.describe('layout on a small phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const path of ['/', '/nimporte-quoi']) {
    test(`${path} fits a 320px screen without horizontal scrolling`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await expect(page.getByRole('contentinfo')).toBeVisible();
    });
  }
});

test('the home page loads without console errors or uncaught exceptions', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });
  page.on('pageerror', (error) => problems.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(problems).toEqual([]);
});
