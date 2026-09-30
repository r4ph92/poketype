import { expect, test } from '@playwright/test';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';

test.describe('home page', () => {
  test('shows the title and the French welcome line', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(fr.Metadata.title);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.Home.title);
    await expect(page.getByText(fr.Home.welcome)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('footer carries the notice in French and English', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    for (const [locale, messages] of [['fr', fr.Footer], ['en', en.Footer]] as const) {
      const block = footer.locator(`[lang="${locale}"]`);
      await expect(block).toContainText(messages.notice);
      await expect(block).toContainText(messages.rights);
      await expect(block).toContainText(messages.affiliation);
    }
  });
});

test.describe('unknown address', () => {
  test('answers 404 with a French page, a home link and no stack trace', async ({ page }) => {
    const response = await page.goto('/nimporte-quoi');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.NotFound.heading);
    await expect(page.getByRole('link', { name: fr.NotFound.homeLink })).toHaveAttribute('href', '/');
    await expect(page.getByRole('contentinfo')).toContainText(fr.Footer.notice);
    await expect(page.locator('body')).not.toContainText(/stack|\bat .*\.(t|j)sx?:\d+/i);
  });
});
