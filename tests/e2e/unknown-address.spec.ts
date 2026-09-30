import { expect, test } from '@playwright/test';
import fr from '../../messages/fr.json';

const stackTracePattern = /stack|\bat .*\.(t|j)sx?:\d+|node_modules|Error:|webpack|turbopack/i;

const unknownAddresses = [
  '/nimporte-quoi',
  '/NIMPORTE-QUOI',
  '/un/chemin/profond',
  '/%C3%A9t%C3%A9-%F0%9F%98%80',
  '/%',
  '/.env',
  '/package.json',
  '/api/inexistante',
  `/${'a'.repeat(2000)}`,
];

test.describe('unknown addresses', () => {
  for (const path of unknownAddresses) {
    test(`${path.slice(0, 40)} answers 404 with the French page and a home link, without stack trace`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.NotFound.heading);
      await expect(page.getByText(fr.NotFound.message)).toBeVisible();
      await expect(page.getByRole('link', { name: fr.NotFound.homeLink })).toHaveAttribute('href', '/');
      await expect(page.locator('body')).not.toContainText(stackTracePattern);
      await expect(page.locator('body')).not.toContainText('This page could not be found');
    });
  }

  test('script tags in the query string of an unknown address are not reflected', async ({ page }) => {
    let dialogOpened = false;
    page.on('dialog', async (dialog) => {
      dialogOpened = true;
      await dialog.dismiss();
    });
    const response = await page.goto('/nimporte-quoi?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
    expect(response?.status()).toBe(404);
    expect(await page.content()).not.toContain('<script>alert(1)</script>');
    expect(dialogOpened).toBe(false);
  });

  test('a HEAD request on an unknown address answers 404', async ({ request }) => {
    const response = await request.head('/nimporte-quoi');
    expect(response.status()).toBe(404);
  });

  test('the home link leads to the home page, and the back button returns to the 404 page', async ({ page }) => {
    await page.goto('/nimporte-quoi');
    await page.getByRole('link', { name: fr.NotFound.homeLink }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.Home.title);
    await expect(page.getByText(fr.Home.welcome)).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL('/nimporte-quoi');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.NotFound.heading);
  });

  test('the home link is reachable with the keyboard', async ({ page }) => {
    await page.goto('/nimporte-quoi');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: fr.NotFound.homeLink })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/');
  });
});
