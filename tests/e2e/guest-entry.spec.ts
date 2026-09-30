import { expect, test } from '@playwright/test';
import fr from '../../messages/fr.json';
import { gameConfig } from '../../src/config/game';
import {
  countGuestsNamed,
  countSessionsFor,
  enterAsGuest,
  greetingFor,
  insertSession,
  lengthErrorMessage,
  readSessionToken,
  sessionCookieName,
  sessionLifetimeSeconds,
  setSessionCookie,
  submitTrainerName,
  uniqueName,
} from './support/guests';

const entryForm = (page: import('@playwright/test').Page) => page.getByLabel(fr.GuestEntry.label);

test.describe('announcing errors', () => {
  test('the same error submitted twice with Enter re-mounts the alert so it is announced again', async ({ page }) => {
    await submitTrainerName(page, 'A');
    const alert = page.locator('#trainer-name-error');
    await expect(alert).toBeVisible();
    await alert.evaluate((node) => Object.assign(node, { firstAnnouncement: true }));

    await entryForm(page).press('Enter');
    await expect(alert).toBeVisible();
    await expect.poll(() => alert.evaluate((node) => 'firstAnnouncement' in node)).toBe(false);
  });
});

test.describe('entering as a guest', () => {
  test('a valid name leads to the play page that greets the trainer as a guest', async ({ page }) => {
    const name = uniqueName('Alex ');
    await enterAsGuest(page, name);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(greetingFor(name));
    await expect(page.getByText(fr.Play.guestLabel, { exact: true })).toBeVisible();
  });

  test('accented names, hyphens and digits are accepted', async ({ page }) => {
    await enterAsGuest(page, `Zoé-${uniqueName()}`.slice(0, 16));
    await expect(page.getByText(fr.Play.guestLabel, { exact: true })).toBeVisible();
  });

  test('the session cookie is httpOnly, lax and lasts only for the browser session', async ({ page, context }) => {
    await enterAsGuest(page, uniqueName());
    const cookie = (await context.cookies()).find(({ name }) => name === sessionCookieName)!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Lax');
    expect(cookie.expires).toBe(-1);
    expect(cookie.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

test.describe('session lifetime and page title', () => {
  test('the server expires a guest session after the configured number of hours', async ({ page, context }) => {
    await enterAsGuest(page, uniqueName());
    const seconds = await sessionLifetimeSeconds(await readSessionToken(context));
    expect(seconds).toBe(gameConfig.guestSessionLifetimeHours * 3600);
  });

  test('the play page has its own French title', async ({ page }) => {
    await enterAsGuest(page, uniqueName());
    await expect(page).toHaveTitle(fr.Metadata.playTitle);
  });

  test('a failed submission moves focus to the field, every time', async ({ page }) => {
    await submitTrainerName(page, '');
    await expect(entryForm(page)).toBeFocused();
    await page.getByRole('button', { name: fr.GuestEntry.submit }).click();
    await expect(entryForm(page)).toBeFocused();
  });
});

test.describe('staying the same guest', () => {
  test('a refresh and a new tab of the same browser keep the trainer name', async ({ page, context }) => {
    const name = uniqueName('Alex ');
    await enterAsGuest(page, name);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(greetingFor(name));
    const secondTab = await context.newPage();
    await secondTab.goto('/play');
    await expect(secondTab.getByRole('heading', { level: 1 })).toHaveText(greetingFor(name));
    await expect(entryForm(secondTab)).toHaveCount(0);
  });

  test('the home page sends a guest who already has a session to the play page', async ({ page }) => {
    const name = uniqueName('Alex ');
    await enterAsGuest(page, name);
    await page.goto('/');
    await expect(page).toHaveURL('/play');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(greetingFor(name));
  });
});

test.describe('refusing invalid names', () => {
  const unique = uniqueName();
  const cases = [
    { title: 'an empty name', name: '', message: fr.GuestEntry.errors.required },
    { title: 'only spaces', name: '     ', message: fr.GuestEntry.errors.required },
    { title: 'a single character', name: 'A', message: lengthErrorMessage() },
    { title: 'seventeen characters', name: `${unique}abcdefghi`, message: lengthErrorMessage() },
    { title: 'markup', name: `<b>${unique}</b>`, message: fr.GuestEntry.errors.characters },
    { title: 'a leading hyphen', name: `-${unique}`, message: fr.GuestEntry.errors.characters },
    { title: 'an underscore', name: `${unique}_1`, message: fr.GuestEntry.errors.characters },
  ];

  for (const { title, name, message } of cases) {
    test(`${title} shows the French rule, keeps the typed text and creates no guest`, async ({ page, context }) => {
      await submitTrainerName(page, name);
      await expect(page.locator('#trainer-name-error')).toHaveText(message);
      await expect(page).toHaveURL('/');
      await expect(entryForm(page)).toHaveValue(name);
      expect((await context.cookies()).some((cookie) => cookie.name === sessionCookieName)).toBe(false);
      expect(await countGuestsNamed(name)).toBe(0);
    });
  }

  test('the error is linked to the field for screen readers', async ({ page }) => {
    await submitTrainerName(page, '');
    await expect(entryForm(page)).toHaveAttribute('aria-invalid', 'true');
    await expect(entryForm(page)).toHaveAccessibleDescription(new RegExp(fr.GuestEntry.errors.required));
  });
});

test.describe('without a valid session', () => {
  test('opening the play page directly sends the visitor to the home page form', async ({ page }) => {
    await page.goto('/play');
    await expect(page).toHaveURL('/');
    await expect(entryForm(page)).toBeVisible();
  });

  test('invented, malformed, altered and expired cookies never reveal a guest', async ({ browser, page }) => {
    const name = uniqueName('Alex ');
    await enterAsGuest(page, name);
    const realToken = await readSessionToken(page.context());
    const alteredToken = `${realToken.slice(0, 42)}${realToken.endsWith('A') ? 'B' : 'A'}`;
    const expiredToken = `${uniqueName()}${'x'.repeat(35)}`;
    await insertSession(expiredToken, name, new Date(Date.now() - 60_000));

    const forgedValues = ['invented', '%E0%A4%A', 'a'.repeat(43), alteredToken, expiredToken];
    for (const value of forgedValues) {
      const zoe = await browser.newContext();
      await setSessionCookie(zoe, value);
      const zoePage = await zoe.newPage();
      await zoePage.goto('/play');
      await expect(zoePage, value).toHaveURL('/');
      await expect(entryForm(zoePage)).toBeVisible();
      await expect(zoePage.locator('body')).not.toContainText(name);
      await zoe.close();
    }
  });
});

test.describe('changing trainer', () => {
  test('the button ends the session server-side and shows the form again', async ({ browser, page, context }) => {
    await enterAsGuest(page, uniqueName());
    const token = await readSessionToken(context);
    await page.getByRole('button', { name: fr.Play.leave }).click();
    await expect(page).toHaveURL('/');
    await expect(entryForm(page)).toBeVisible();
    expect(await countSessionsFor(token)).toBe(0);

    const replay = await browser.newContext();
    await setSessionCookie(replay, token);
    const replayPage = await replay.newPage();
    await replayPage.goto('/play');
    await expect(replayPage).toHaveURL('/');
    await replay.close();
  });
});
