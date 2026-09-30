import { expect, test, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import {
  countGuestsNamed,
  countSessionsFor,
  enterAsGuest,
  greetingFor,
  readSessionToken,
  sessionCookieName,
  submitTrainerName,
  uniqueName,
} from './support/guests';
import { captureEntrySubmission, grantsSessionCookie, replaySubmission } from './support/submissions';

const nameField = (page: Page) => page.getByLabel(fr.GuestEntry.label);
const greeting = (page: Page) => page.getByRole('heading', { level: 1 });

async function hasSessionCookie(page: Page): Promise<boolean> {
  return (await page.context().cookies()).some(({ name }) => name === sessionCookieName);
}

test.describe('two trainers in two browsers', () => {
  test('Alex and Zoe keep their own identity, and Zoe changing trainer leaves Alex playing', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const zoe = uniqueName('Zoe ');
    const zoeContext = await browser.newContext();
    const zoePage = await zoeContext.newPage();

    await enterAsGuest(page, alex);
    await enterAsGuest(zoePage, zoe);
    await page.reload();
    await zoePage.reload();
    await expect(greeting(page)).toHaveText(greetingFor(alex));
    await expect(greeting(zoePage)).toHaveText(greetingFor(zoe));

    await zoePage.getByRole('button', { name: fr.Play.leave }).click();
    await expect(zoePage).toHaveURL('/');
    await page.reload();
    await expect(greeting(page)).toHaveText(greetingFor(alex));
    await zoeContext.close();
  });

  test('two guests may share the same trainer name without seeing each other', async ({ browser, page }) => {
    const sharedName = uniqueName('Alex ');
    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await enterAsGuest(page, sharedName);
    await enterAsGuest(otherPage, sharedName);
    expect(await readSessionToken(page.context())).not.toBe(await readSessionToken(otherContext));
    expect(await countGuestsNamed(sharedName)).toBe(2);
    await otherContext.close();
  });
});

test.describe('shared classroom computer', () => {
  test('after changing trainer, the back button never shows the previous trainer again', async ({ page }) => {
    const alex = uniqueName('Alex ');
    await enterAsGuest(page, alex);
    await page.getByRole('button', { name: fr.Play.leave }).click();
    await expect(nameField(page)).toBeVisible();

    for (let step = 0; step < 2; step++) {
      await page.goBack();
      await expect(page.locator('body')).not.toContainText(alex);
    }
  });

  test('the next student who enters is greeted with their own name only', async ({ page }) => {
    const alex = uniqueName('Alex ');
    const zoe = uniqueName('Zoe ');
    await enterAsGuest(page, alex);
    const alexToken = await readSessionToken(page.context());
    await page.getByRole('button', { name: fr.Play.leave }).click();
    await enterAsGuest(page, zoe);
    await page.reload();
    await expect(greeting(page)).toHaveText(greetingFor(zoe));
    await expect(page.locator('body')).not.toContainText(alex);
    expect(await countSessionsFor(alexToken)).toBe(0);
  });
});

test.describe('stale forms', () => {
  test('a home page left open in a second tab cannot silently replace the current trainer', async ({ context, page }) => {
    const alex = uniqueName('Alex ');
    const zoe = uniqueName('Zoe ');
    const staleTab = await context.newPage();
    await staleTab.goto('/');
    await enterAsGuest(page, alex);

    await nameField(staleTab).fill(zoe);
    const submission = staleTab.waitForResponse((response) => response.request().method() === 'POST');
    await staleTab.getByRole('button', { name: fr.GuestEntry.submit }).click();
    await submission;

    await page.reload();
    await expect(greeting(page)).toHaveText(greetingFor(alex));
    expect(await countGuestsNamed(zoe)).toBe(0);
  });
});

test.describe('names that look empty', () => {
  const cases = [
    { title: 'Hangul filler letters that render as blank', name: 'ㅤㅤ' },
    { title: 'one visible letter padded with an invisible combining grapheme joiner', name: 'A͏' },
    { title: 'one visible letter padded with an invisible variation selector', name: 'Z️' },
  ];

  for (const { title, name } of cases) {
    test(`${title} are refused with a French message`, async ({ page }) => {
      await submitTrainerName(page, name);
      await expect(page.locator('#trainer-name-error')).toBeVisible();
      await expect(page).toHaveURL('/');
      expect(await hasSessionCookie(page)).toBe(false);
    });
  }
});

test.describe('oversized input', () => {
  test('a pasted name over one megabyte gets the French length rule instead of a server error page', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await nameField(page).fill('a'.repeat(1_100_000));
    await page.getByRole('button', { name: fr.GuestEntry.submit }).click();
    await expect(page.locator('#trainer-name-error')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('server error');
    expect(await hasSessionCookie(page)).toBe(false);
  });
});

test.describe('cross-site submission', () => {
  test('an entry replayed with a foreign Origin creates no guest and no session', async ({ page, request }) => {
    const name = uniqueName('Csrf ');
    const captured = await captureEntrySubmission(page, name);

    const foreign = await replaySubmission(request, captured, {
      ...captured.headers,
      origin: 'http://evil.example',
      referer: 'http://evil.example/',
    });
    expect(grantsSessionCookie(foreign, sessionCookieName)).toBe(false);
    expect(await countGuestsNamed(name)).toBe(0);

    const sameOrigin = await replaySubmission(request, captured, captured.headers);
    expect(grantsSessionCookie(sameOrigin, sessionCookieName), 'control: the same replay from the app origin works').toBe(true);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('an invalid name still gets the French rule and a valid one reaches the play page', async ({ page }) => {
    await submitTrainerName(page, 'A');
    await expect(page.locator('#trainer-name-error')).toHaveText(
      fr.GuestEntry.errors.length.replace('{min}', '2').replace('{max}', '16'),
    );
    const name = uniqueName('NoJs ');
    await submitTrainerName(page, name);
    await expect(page).toHaveURL('/play');
    await expect(greeting(page)).toHaveText(greetingFor(name));
  });

  test('a pasted name over one megabyte still gets the French length rule instead of a server error', async ({ page }) => {
    test.setTimeout(60_000);
    await submitTrainerName(page, 'a'.repeat(1_100_000));
    await expect(page.locator('#trainer-name-error')).toHaveText(
      fr.GuestEntry.errors.length.replace('{min}', '2').replace('{max}', '16'),
    );
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
    expect(await hasSessionCookie(page)).toBe(false);
  });
});

test.describe('failed requests', () => {
  test('a rejected entry request shows the French error page, and retrying brings the form back', async ({ page }) => {
    await page.route('/', (route) =>
      route.request().method() === 'POST' ? route.fulfill({ status: 403, body: '' }) : route.continue(),
    );
    await submitTrainerName(page, uniqueName('Err '));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.ServerError.heading);
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    expect(await hasSessionCookie(page)).toBe(false);

    await page.unroute('/');
    const retryRequest = page.waitForRequest(
      (request) => request.method() === 'GET' && new URL(request.url()).pathname === '/' && 'rsc' in request.headers(),
    );
    await page.getByRole('button', { name: fr.ServerError.retry }).click();
    await retryRequest;
    await expect(nameField(page)).toBeVisible();
  });
});

test.describe('narrow screens', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('a sixteen-character name in capitals does not make the play page scroll sideways', async ({ page }) => {
    await enterAsGuest(page, 'MOHAMMEDABDULLAH');
    const widths = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  });
});
