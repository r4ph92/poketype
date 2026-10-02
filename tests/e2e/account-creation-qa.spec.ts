import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';
import fr from '../../messages/fr.json';
import {
  accountLabel,
  captureSignUpSubmission,
  countUsersNamed,
  fillSignUp,
  findAccount,
  signUpField,
  uniquePassword,
  uniqueUsername,
} from './support/accounts';
import { enterAsGuest, readSessionToken, sessionCookieName, uniqueName, withTestDatabase } from './support/guests';
import { addMemberToRoom, createRoom } from './support/rooms';
import { grantsSessionCookie, type CapturedSubmission } from './support/submissions';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { en, localeButton, switchInterfaceTo } from './support/locale';
import { hashSessionToken } from '../../src/server/sessions/session-token';

const accountNavigation = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: fr.AccountBar.label });

async function replayWithCookie(request: APIRequestContext, captured: CapturedSubmission, cookie: string, body = captured.body): Promise<APIResponse> {
  return request.post('/signup', { headers: { ...captured.headers, cookie }, data: body, maxRedirects: 0 });
}

function withUsername(body: Buffer, from: string, to: string): Buffer {
  return Buffer.from(body.toString('latin1').replace(from, to), 'latin1');
}

async function roomRevision(roomId: string): Promise<number> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`select revision from rooms where id = ${roomId}`;
    return row!.revision as number;
  });
}

async function accountsOfGuestNamed(usernames: string[]): Promise<string[]> {
  return withTestDatabase(async (sql) => {
    const rows = await sql`select username from users where username in ${sql(usernames)}`;
    return rows.map(({ username }) => username as string);
  });
}

const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

test.describe('a guest in a waiting room signs up', () => {
  test('keeps the membership and host role, bumps that room revision by one, and leaves other rooms untouched', async ({ browser, page }) => {
    await enterAsGuest(page, uniqueName('Maya '));
    const roomId = await createRoom(page);
    const partnerName = uniqueName('Leo ');
    await addMemberToRoom(roomId, partnerName);

    const stranger = await (await browser.newContext()).newPage();
    await enterAsGuest(stranger, uniqueName('Zoe '));
    const otherRoomId = await createRoom(stranger);

    const revisionBefore = await roomRevision(roomId);
    const otherRevisionBefore = await roomRevision(otherRoomId);

    const username = uniqueUsername();
    await page.goto('/signup');
    await fillSignUp(page, { username, password: uniquePassword() });
    await expect(page).toHaveURL('/choose-trainer');

    expect(await roomRevision(roomId)).toBe(revisionBefore + 1);
    expect(await roomRevision(otherRoomId)).toBe(otherRevisionBefore);

    await page.goto(`/rooms/${roomId}`);
    const members = page.getByRole('list').getByRole('listitem');
    await expect(members).toHaveCount(2);
    await expect(members.filter({ hasText: username })).toContainText(fr.Room.hostBadge);
    await expect(members.filter({ hasText: partnerName })).toHaveCount(1);
    await expect(accountNavigation(page)).toHaveText(accountLabel(username));
    await stranger.context().close();
  });
});

test.describe('submitting the same sign up twice', () => {
  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('a double click on "Créer mon compte" leaves Maya logged in to her new account', async ({ page }) => {
      await enterAsGuest(page, uniqueName('Maya '));
      const username = uniqueUsername();
      const password = uniquePassword();
      await page.goto('/signup');
      await signUpField.username(page).fill(username);
      await signUpField.password(page).fill(password);
      await signUpField.confirmation(page).fill(password);
      await page.getByRole('button', { name: fr.SignUp.submit }).dblclick();
      await expect(page.locator('#signup-username-error').or(accountNavigation(page).getByText(accountLabel(username)))).toBeVisible();

      await page.waitForLoadState('networkidle');
      const shownTaken = await page.locator('#signup-username-error').isVisible();
      expect(await countUsersNamed(username)).toBe(1);
      await page.goto('/play');
      await expect(page, 'Maya is still logged in').toHaveURL('/play');
      await expect(accountNavigation(page)).toHaveText(accountLabel(username));
      expect(shownTaken, 'Maya is never told that her own new name is taken').toBe(false);
    });

    test('clicking "Créer mon compte" again while the first click is being saved leaves Maya logged in to her new account', async ({
      page,
    }) => {
      await enterAsGuest(page, uniqueName('Maya '));
      const username = uniqueUsername();
      const password = uniquePassword();
      await page.goto('/signup');
      await signUpField.username(page).fill(username);
      await signUpField.password(page).fill(password);
      await signUpField.confirmation(page).fill(password);
      const submit = page.getByRole('button', { name: fr.SignUp.submit });
      await submit.scrollIntoViewIfNeeded();
      const box = (await submit.boundingBox())!;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await pause(150);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      const alreadyCreated = page.getByRole('alert').filter({ hasText: fr.SignUp.errors.form.alreadyAccount });
      await expect(accountNavigation(page).getByText(accountLabel(username)).or(alreadyCreated)).toBeVisible();
      await page.waitForLoadState('networkidle');

      const shownTaken = await page.locator('#signup-username-error').isVisible();
      expect(await countUsersNamed(username)).toBe(1);
      expect(shownTaken, 'Maya is never told that her own new name is taken').toBe(false);
      await page.goto('/play');
      await expect(page, 'Maya is still logged in').toHaveURL('/play');
      await expect(accountNavigation(page)).toHaveText(accountLabel(username));
    });

    test('a resubmission arriving while the first is saved is not told that its own name is taken', async ({ page, request }) => {
      await enterAsGuest(page, uniqueName('Maya '));
      const cookie = `${sessionCookieName}=${await readSessionToken(page.context())}`;
      const username = uniqueUsername();
      const captured = await captureSignUpSubmission(page, { username, password: uniquePassword() });

      const first = replayWithCookie(request, captured, cookie);
      await pause(100);
      const second = await replayWithCookie(request, captured, cookie);
      expect(grantsSessionCookie(await first, sessionCookieName)).toBe(true);

      expect(await countUsersNamed(username)).toBe(1);
      expect(await second.text()).not.toContain('id="signup-username-error"');
      expect(grantsSessionCookie(second, sessionCookieName)).toBe(true);
    });
  });

  test('two submissions from one guest session with different names create only one account', async ({ page, request }) => {
    await enterAsGuest(page, uniqueName('Maya '));
    const cookie = `${sessionCookieName}=${await readSessionToken(page.context())}`;
    const firstName = uniqueUsername('MayaA_');
    const secondName = uniqueUsername('MayaB_');
    const captured = await captureSignUpSubmission(page, { username: firstName, password: uniquePassword() });

    const first = replayWithCookie(request, captured, cookie);
    await pause(100);
    const second = replayWithCookie(request, captured, cookie, withUsername(captured.body, firstName, secondName));
    await Promise.all([first, second]);

    expect(await accountsOfGuestNamed([firstName, secondName])).toHaveLength(1);
  });
});

test.describe('forged action state', () => {
  test.use({ javaScriptEnabled: false });

  test('a sign up whose previous form state was replaced by null is answered without a server error', async ({ page, request }) => {
    const captured = await captureSignUpSubmission(page, { username: '', password: '' });
    const forged = Buffer.from(
      captured.body.toString('latin1').replace(/(name="\$ACTION_1:1"\r\n\r\n)[^\r]*/, '$1[null]'),
      'latin1',
    );
    const response = await request.post('/signup', { headers: captured.headers, data: forged, maxRedirects: 0 });
    expect(response.status()).toBeLessThan(500);
    expect(await findAccount('')).toBeNull();
  });
});

async function expireSession(token: string): Promise<void> {
  await withTestDatabase(async (sql) => {
    await sql`update sessions set expires_at = now() - interval '1 minute' where token_hash = ${hashSessionToken(token)}`;
  });
}

async function signUpAs(page: import('@playwright/test').Page, username: string, password = uniquePassword()): Promise<void> {
  await page.goto('/signup');
  await fillSignUp(page, { username, password });
  await expect(page).toHaveURL('/choose-trainer');
}

test.describe('a browser whose account session has expired', () => {
  test('signs up a second account with a new name and is logged in to it', async ({ page, context }) => {
    const firstName = uniqueUsername('Old_');
    await signUpAs(page, firstName);
    await expireSession(await readSessionToken(context));

    const secondName = uniqueUsername('New_');
    await page.goto('/signup');
    await expect(accountNavigation(page).getByRole('link', { name: fr.AccountBar.signUp })).toBeVisible();
    await fillSignUp(page, { username: secondName, password: uniquePassword() });

    await expect(page).toHaveURL('/choose-trainer');
    await expect(accountNavigation(page)).toHaveText(accountLabel(secondName));
    expect(await countUsersNamed(secondName)).toBe(1);
  });

  test('typing the old name in another case with another password is told "Ce nom est déjà pris"', async ({ page, context }) => {
    const firstName = uniqueUsername('Old_');
    await signUpAs(page, firstName);
    await expireSession(await readSessionToken(context));

    await page.goto('/signup');
    await fillSignUp(page, { username: firstName.toUpperCase(), password: uniquePassword() });

    await expect(page.locator('#signup-username-error')).toHaveText(fr.SignUp.errors.username.taken);
    await expect(page).toHaveURL('/signup');
    expect(await countUsersNamed(firstName)).toBe(1);
  });
});

test.describe('the language switch on the sign up page', () => {
  test('switches the notice, labels, errors and title to English and back to French', async ({ page }) => {
    await page.goto('/signup');
    await switchInterfaceTo(page, 'en');
    await expect(page).toHaveURL('/signup');
    await expect(page).toHaveTitle(en.Metadata.signUpTitle);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.SignUp.heading);
    await expect(page.getByText(en.SignUp.noticeNoRecovery)).toBeVisible();
    await page.getByLabel(en.SignUp.usernameLabel).fill('ab');
    await page.getByLabel(en.SignUp.passwordLabel, { exact: true }).fill('short');
    await page.getByLabel(en.SignUp.confirmationLabel).fill('other');
    await page.getByRole('button', { name: en.SignUp.submit }).click();
    await expect(page.locator('#signup-username-error')).toHaveText(en.SignUp.errors.username.length.replace('{min}', '3').replace('{max}', '20'));
    await expect(page.locator('#signup-password-error')).toHaveText(en.SignUp.errors.password.tooShort.replace('{min}', '8'));
    await expect(page.locator('#signup-confirmation-error')).toHaveText(en.SignUp.errors.confirmation.mismatch);
    await expectEveryVisibleStringFromCatalog(page, ['ab'], 'en');

    await switchInterfaceTo(page, 'fr');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.SignUp.heading);
    await expect(page).toHaveTitle(fr.Metadata.signUpTitle);
    await expectEveryVisibleStringFromCatalog(page, ['ab'], 'fr');
  });

  test('an English sign up logs Maya in and the header shows her username in English', async ({ page }) => {
    await page.goto('/signup');
    await switchInterfaceTo(page, 'en');
    const username = uniqueUsername();
    const password = uniquePassword();
    await page.getByLabel(en.SignUp.usernameLabel).fill(username);
    await page.getByLabel(en.SignUp.passwordLabel, { exact: true }).fill(password);
    await page.getByLabel(en.SignUp.confirmationLabel).fill(password);
    await page.getByRole('button', { name: en.SignUp.submit }).click();
    await expect(page).toHaveURL('/choose-trainer');
    await expect(page.getByRole('navigation', { name: en.AccountBar.label })).toHaveText(en.AccountBar.account.replace('{username}', username));
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('switches the sign up page to English and keeps the address', async ({ page }) => {
      await page.goto('/signup');
      await localeButton(page, 'en').click();
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page).toHaveURL('/signup');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.SignUp.heading);
      await expectEveryVisibleStringFromCatalog(page, [], 'en');
    });
  });
});

test.describe('double submission with JavaScript', () => {
  test('a double click creates one account, logs Maya in and never says her name is taken', async ({ page }) => {
    await enterAsGuest(page, uniqueName('Maya '));
    const username = uniqueUsername();
    const password = uniquePassword();
    await page.goto('/signup');
    await signUpField.username(page).fill(username);
    await signUpField.password(page).fill(password);
    await signUpField.confirmation(page).fill(password);
    await page.getByRole('button', { name: fr.SignUp.submit }).dblclick();
    await expect(page).toHaveURL('/choose-trainer');
    await expect(accountNavigation(page)).toHaveText(accountLabel(username));
    expect(await countUsersNamed(username)).toBe(1);
    await page.reload();
    await expect(accountNavigation(page)).toHaveText(accountLabel(username));
  });
});

test.describe('hostile sign up input', () => {
  test('markup in the username is refused by rule, shown back as plain text and never runs', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });
    const hostile = `"><img src=x onerror=alert(1)><script>alert(2)</script>`;
    await page.goto('/signup');
    await fillSignUp(page, { username: hostile, password: uniquePassword() });
    await expect(page.locator('#signup-username-error')).toHaveText(fr.SignUp.errors.username.characters);
    await expect(signUpField.username(page)).toHaveValue(hostile);
    await expect(page.locator('main img[src="x"]')).toHaveCount(0);
    expect(dialogs).toEqual([]);
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('fields far past the input limits are answered with the rule, not a server error', async ({ page, request }) => {
      const captured = await captureSignUpSubmission(page, { username: 'LongName_x', password: 'mdp-longlong' });
      const body = captured.body
        .toString('latin1')
        .replace('LongName_x', 'L'.repeat(5000))
        .replaceAll('mdp-longlong', 'p'.repeat(50000));
      const response = await request.post('/signup', { headers: captured.headers, data: Buffer.from(body, 'latin1'), maxRedirects: 0 });
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(html).toContain('id="signup-username-error"');
      expect(html).toContain('id="signup-password-error"');
      expect(html).not.toContain('p'.repeat(200));
    });
  });
});

async function retireMinutesAgo(token: string, minutes: number): Promise<void> {
  await withTestDatabase(async (sql) => {
    await sql`update sessions set expires_at = now() - make_interval(mins => ${minutes}) where token_hash = ${hashSessionToken(token)}`;
  });
}

test.describe('a guest session replayed after its sign up', () => {
  test.use({ javaScriptEnabled: false });

  async function signUpThenReplay(page: import('@playwright/test').Page, request: APIRequestContext, minutesAgo: number, locale?: 'en') {
    await enterAsGuest(page, uniqueName('Maya '));
    const guestToken = await readSessionToken(page.context());
    const cookie = `${sessionCookieName}=${guestToken}`;
    const captured = await captureSignUpSubmission(page, { username: uniqueUsername('First_'), password: uniquePassword() });
    expect(grantsSessionCookie(await replayWithCookie(request, captured, cookie), sessionCookieName)).toBe(true);
    await retireMinutesAgo(guestToken, minutesAgo);
    const firstName = /First_[0-9a-f]{8}/.exec(captured.body.toString('latin1'))![0];
    const secondName = uniqueUsername('Second_');
    const replayCookie = locale ? `${cookie}; poketype_locale=${locale}` : cookie;
    const response = await replayWithCookie(request, captured, replayCookie, withUsername(captured.body, firstName, secondName));
    return { response, secondName };
  }

  test('nine minutes later it is told in French that this browser already created an account', async ({ page, request }) => {
    const { response, secondName } = await signUpThenReplay(page, request, 9);
    expect(await response.text()).toContain(fr.SignUp.errors.form.alreadyAccount);
    expect(grantsSessionCookie(response, sessionCookieName)).toBe(false);
    expect(await countUsersNamed(secondName)).toBe(0);
  });

  test('with English chosen, the already-created message is in English', async ({ page, request }) => {
    const { response } = await signUpThenReplay(page, request, 1, 'en');
    const html = await response.text();
    expect(html).toContain(en.SignUp.errors.form.alreadyAccount);
    expect(html).not.toContain(fr.SignUp.errors.form.alreadyAccount);
  });

  test('eleven minutes later it counts as no session and opens a new account', async ({ page, request }) => {
    const { response, secondName } = await signUpThenReplay(page, request, 11);
    expect(response.status()).toBe(303);
    expect(grantsSessionCookie(response, sessionCookieName)).toBe(true);
    expect(await countUsersNamed(secondName)).toBe(1);
  });
});
