import { expect, test, type Page } from '@playwright/test';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';

type Catalog = { [key: string]: string | Catalog };

function catalogValues(catalog: Catalog): string[] {
  return Object.values(catalog).flatMap((value) => (typeof value === 'string' ? [value] : catalogValues(value)));
}

const frenchStrings = new Set(catalogValues(fr));
const englishFooterStrings = new Set(catalogValues(en.Footer));

type VisibleText = { text: string; lang: string };

async function visibleTexts(page: Page): Promise<VisibleText[]> {
  return page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const texts: { text: string; lang: string }[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim() ?? '';
      const element = node.parentElement;
      if (!text || !element || element.closest('script, style, template, noscript')) continue;
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (box.width === 0 || box.height === 0 || style.visibility === 'hidden') continue;
      texts.push({ text, lang: element.closest('[lang]')?.getAttribute('lang') ?? '' });
    }
    return texts;
  });
}

async function expectEveryVisibleStringFromCatalog(page: Page): Promise<void> {
  const texts = await visibleTexts(page);
  expect(texts.length).toBeGreaterThan(0);
  for (const { text, lang } of texts) {
    const allowed = lang === 'en' ? englishFooterStrings : frenchStrings;
    expect(allowed.has(text), `"${text}" (lang=${lang}) is not a catalog value`).toBe(true);
  }
}

test.describe('French interface from the catalog', () => {
  test('every visible string on the home page is a French catalog value, English only in the footer block', async ({ page }) => {
    await page.goto('/');
    await expectEveryVisibleStringFromCatalog(page);
  });

  test('every visible string on the 404 page is a French catalog value, English only in the footer block', async ({ page }) => {
    await page.goto('/nimporte-quoi');
    await expectEveryVisibleStringFromCatalog(page);
    await expect(page).toHaveTitle(fr.Metadata.notFoundTitle);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('a browser asking for English still gets the French interface', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US', extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' } });
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: 'http://localhost:3100' }]);
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
        for (const line of Object.values(messages)) {
          await expect(block).toContainText(line);
        }
      }
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
