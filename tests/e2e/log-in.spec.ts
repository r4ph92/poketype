import { chromium, expect, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { accountLabel, captureSignUpSubmission, countUsersNamed, findSessionRow, replaySignUp, uniquePassword, uniqueUsername } from './support/accounts';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { commandTest as test } from './support/commands';
import { enterAsGuest, readSessionToken, sessionCookieName, setSessionCookie, uniqueName } from './support/guests';
import {
  accountNavigation,
  countLoginFailures,
  createPasswordAccount,
  fillLogIn,
  insertLoginFailures,
  logInAlert,
  logInAsMaya,
  logInField,
  maya,
  submitLogIn,
  throttledMessage,
} from './support/login';
import { createRoom, newGuestPage, playerRows, roomPagePath } from './support/rooms';
import { grantsSessionCookie } from './support/submissions';
import { readHubNumbers } from './support/trainer';

const invalidCredentials = fr.LogIn.errors.form.invalidCredentials;

function rowOf(page: Page, name: string) {
  return playerRows(page).filter({ has: page.getByText(name, { exact: true }) });
}

async function expectVisitorHeader(page: Page): Promise<void> {
  await expect(accountNavigation(page).getByRole('link', { name: fr.AccountBar.logIn })).toBeVisible();
  await expect(accountNavigation(page)).not.toContainText(maya.username);
}

test.describe('logging in with a username and password', () => {
  test('the header link opens the French log-in page', async ({ page }) => {
    await page.goto('/');
    await accountNavigation(page).getByRole('link', { name: fr.AccountBar.logIn }).click();
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.LogIn.heading);
    await expect(page).toHaveTitle(fr.Metadata.logInTitle);
    await expect(logInField.username(page)).toHaveAttribute('autocomplete', 'username');
    await expect(logInField.password(page)).toHaveAttribute('autocomplete', 'current-password');
  });

  test('Maya logs in, the header shows "Maya" and she stays logged in after a refresh', async ({ page }) => {
    await logInAsMaya(page);
    await expect(accountNavigation(page)).toHaveText(accountLabel(maya.username));

    await page.reload();

    await expect(page).toHaveURL('/play');
    await expect(accountNavigation(page)).toHaveText(accountLabel(maya.username));
    await expect(page.getByText(fr.Play.guestLabel, { exact: true })).toHaveCount(0);
  });

  test('logging in from a guest session replaces the guest session with Maya', async ({ page, context }) => {
    await enterAsGuest(page, uniqueName('Alex '));
    const guestToken = await readSessionToken(context);

    await logInAsMaya(page);

    await expect(accountNavigation(page)).toHaveText(accountLabel(maya.username));
    expect(await findSessionRow(guestToken)).toBeNull();
    expect(await readSessionToken(context)).not.toBe(guestToken);
  });

  test('an account opening the log-in page is sent to the play page', async ({ page }) => {
    await logInAsMaya(page);
    await page.goto('/login');
    await expect(page).toHaveURL('/play');
  });
});

test.describe('a wrong password or an unknown username', () => {
  test('both show exactly "Nom d\'utilisateur ou mot de passe incorrect"', async ({ page, database }) => {
    const account = await createPasswordAccount(database);

    await submitLogIn(page, account.username, uniquePassword());
    await expect(logInAlert(page)).toHaveText(invalidCredentials);
    await expect(logInField.username(page)).toHaveValue(account.username);
    await expect(logInField.password(page)).toHaveValue('');

    await submitLogIn(page, uniqueUsername('Nobody_'), account.password);
    await expect(logInAlert(page)).toHaveText(invalidCredentials);
    await expect(page).toHaveURL('/login');
  });

  test('a name the sign-up rules forbid gets the same message, not a format error', async ({ page }) => {
    await submitLogIn(page, 'Maya!', uniquePassword());
    await expect(logInAlert(page)).toHaveText(invalidCredentials);
  });

  test('empty fields ask for each field and focus the first one', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: fr.LogIn.submit }).click();
    await expect(page.locator('#login-username-error')).toHaveText(fr.LogIn.errors.username.required);
    await expect(page.locator('#login-password-error')).toHaveText(fr.LogIn.errors.password.required);
    await expect(logInField.username(page)).toBeFocused();
  });
});

test.describe('too many failed attempts', () => {
  test('after five wrong passwords the right one is refused with a French message', async ({ page, database }) => {
    const account = await createPasswordAccount(database);
    await page.goto('/login');
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await fillLogIn(page, account.username, uniquePassword());
      await expect(logInAlert(page)).toHaveText(invalidCredentials);
    }

    await fillLogIn(page, account.username.toUpperCase(), account.password);

    await expect(logInAlert(page)).toHaveText(throttledMessage());
    await expect(page).toHaveURL('/login');
    expect(await countLoginFailures(account.username.toLowerCase())).toBe(5);
  });
});

test.describe('a locked username during a repeated sign up submission', () => {
  test('the repeat is not completed and gets the plain already-account answer', async ({ page, context, playwright }) => {
    await enterAsGuest(page, uniqueName('Maya '));
    const guestToken = await readSessionToken(context);
    const username = uniqueUsername();
    const captured = await captureSignUpSubmission(page, { username, password: uniquePassword() });
    await insertLoginFailures(username.toLowerCase(), 5);
    const headers = { ...captured.headers, cookie: `${sessionCookieName}=${guestToken}` };

    const first = await playwright.request.newContext({ baseURL: test.info().project.use.baseURL });
    expect(grantsSessionCookie(await replaySignUp(first, captured, { headers }), sessionCookieName)).toBe(true);
    const second = await playwright.request.newContext({ baseURL: test.info().project.use.baseURL });
    const repeated = await replaySignUp(second, captured, { headers });

    expect(grantsSessionCookie(repeated, sessionCookieName)).toBe(false);
    expect(await repeated.text()).toContain('alreadyAccount');
    expect(await countUsersNamed(username)).toBe(1);
    await Promise.all([first.dispose(), second.dispose()]);
  });
});

test.describe('Maya in a room', () => {
  test('a room Maya creates lists her as "Maya" without "Invité", and a guest who joins with the label', async ({ browser, page }) => {
    await logInAsMaya(page);
    const roomId = await createRoom(page);
    const guestName = uniqueName('Zoe ');
    const guest = await newGuestPage(browser, guestName);
    await guest.goto(roomPagePath(roomId));

    await expect(playerRows(page)).toHaveCount(2, { timeout: 6_000 });
    await expect(rowOf(page, maya.username)).not.toContainText(fr.Play.guestLabel);
    await expect(rowOf(page, guestName)).toContainText(fr.Play.guestLabel);
    await expect(rowOf(guest, maya.username)).not.toContainText(fr.Play.guestLabel);
    await guest.context().close();
  });

  test('Maya follows a friend\'s invitation, logs in on the way and appears as "Maya" without "Invité"', async ({ browser, page }) => {
    const hostName = uniqueName('Alex ');
    const host = await newGuestPage(browser, hostName);
    const roomId = await createRoom(host);

    await page.goto(roomPagePath(roomId));
    await page.getByRole('main').getByRole('link', { name: fr.AccountBar.logIn }).click();
    await expect(page).toHaveURL(`/login?room=${roomId}`);
    await fillLogIn(page, maya.username, maya.password);

    await expect(page).toHaveURL(roomPagePath(roomId), { timeout: 15_000 });
    await expect(rowOf(page, maya.username)).not.toContainText(fr.Play.guestLabel);
    await expect(rowOf(page, hostName)).toContainText(fr.Play.guestLabel);
    await expect(rowOf(host, maya.username)).toBeVisible({ timeout: 6_000 });
    await expect(rowOf(host, maya.username)).not.toContainText(fr.Play.guestLabel);
    await host.context().close();
  });
});

test.describe('logging out', () => {
  test('ends the session: visitor header, no session row, and the old cookie replayed is not logged in', async ({ browser, page, context }) => {
    await logInAsMaya(page);
    const token = await readSessionToken(context);

    await page.getByRole('button', { name: fr.AccountBar.logOut }).click();

    await expect(page).toHaveURL('/');
    await expectVisitorHeader(page);
    expect(await findSessionRow(token)).toBeNull();
    const replay = await browser.newContext();
    await setSessionCookie(replay, token);
    const replayPage = await replay.newPage();
    await replayPage.goto('/play');
    await expect(replayPage).toHaveURL('/');
    await expectVisitorHeader(replayPage);
    await replay.close();
  });

  test('Back after logging out never shows Maya again', async ({ page }) => {
    await logInAsMaya(page);
    await page.getByRole('navigation', { name: fr.Header.navLabel }).getByRole('link', { name: fr.Header.tabs.collection }).click();
    await expect(page).toHaveURL('/play/collection');
    await expect(accountNavigation(page)).toHaveText(accountLabel(maya.username));

    await page.getByRole('button', { name: fr.AccountBar.logOut }).click();
    await expect(page).toHaveURL('/');
    await page.goBack();

    await expect(page).toHaveURL('/');
    await expectVisitorHeader(page);
  });

  test('logging out only answers a POST sent by the site itself', async ({ page, context }) => {
    await logInAsMaya(page);
    const token = await readSessionToken(context);

    expect((await page.request.get('/logout', { maxRedirects: 0 })).status()).toBe(405);
    expect((await page.request.post('/logout', { maxRedirects: 0 })).status()).toBe(403);
    expect((await page.request.post('/logout', { maxRedirects: 0, headers: { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' } })).status()).toBe(403);

    expect(await findSessionRow(token)).not.toBeNull();
  });
});

test.describe('Back after logging out with the back-forward cache on', () => {
  test('a page restored from the cache reloads and no longer shows Maya', async () => {
    const browserWithCache = await chromium.launch({ ignoreDefaultArgs: ['--disable-back-forward-cache'] });
    const page = await (await browserWithCache.newContext({ baseURL: test.info().project.use.baseURL })).newPage();
    await logInAsMaya(page);
    await page.goto('/credits');
    await expect(accountNavigation(page)).toHaveText(accountLabel(maya.username));

    await page.getByRole('button', { name: fr.AccountBar.logOut }).click();
    await expect(page).toHaveURL('/');
    await page.goBack();

    await expect(page).toHaveURL('/credits');
    await expectVisitorHeader(page);
    await browserWithCache.close();
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('Maya logs in and out with plain form posts', async ({ page, context }) => {
    await logInAsMaya(page);
    await expect(accountNavigation(page)).toHaveText(accountLabel(maya.username));
    const token = await readSessionToken(context);

    await page.getByRole('button', { name: fr.AccountBar.logOut }).click();

    await expect(page).toHaveURL('/');
    await expectVisitorHeader(page);
    expect(await findSessionRow(token)).toBeNull();
  });

  test('a wrong password shows the same message', async ({ page }) => {
    await submitLogIn(page, uniqueUsername('Nobody_'), uniquePassword());
    await expect(page.getByText(invalidCredentials, { exact: true })).toBeVisible();
  });
});

test.describe('French interface when logging in and out', () => {
  test('every visible string on the log-in page, empty and with each kind of error, is a French catalog value', async ({ page, database }) => {
    await page.goto('/login');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expectEveryVisibleStringFromCatalog(page);
    await page.getByRole('button', { name: fr.LogIn.submit }).click();
    await expect(page.locator('#login-username-error')).toBeVisible();
    await expectEveryVisibleStringFromCatalog(page);
    await submitLogIn(page, 'Personne', uniquePassword());
    await expect(logInAlert(page)).toHaveText(invalidCredentials);
    await expectEveryVisibleStringFromCatalog(page, ['Personne']);
    const account = await createPasswordAccount(database);
    for (let attempt = 1; attempt <= 6; attempt += 1) await fillLogIn(page, account.username, uniquePassword());
    await expect(logInAlert(page)).toHaveText(throttledMessage());
    await expectEveryVisibleStringFromCatalog(page, [account.username]);
  });

  test('the play page after logging in and the home page after logging out are in French', async ({ page }) => {
    await logInAsMaya(page);
    await expect(page.getByRole('button', { name: fr.AccountBar.logOut })).toHaveText(fr.AccountBar.logOut);
    await expectEveryVisibleStringFromCatalog(page, await readHubNumbers(page));
    await page.getByRole('button', { name: fr.AccountBar.logOut }).click();
    await expect(page).toHaveURL('/');
    await expectEveryVisibleStringFromCatalog(page);
  });
});
