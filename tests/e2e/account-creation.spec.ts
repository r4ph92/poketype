import { expect, test, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { seedAccounts } from '../../scripts/seed-accounts';
import {
  accountLabel,
  countUsersNamed,
  fillSignUp,
  findAccount,
  findSessionRow,
  signUp,
  signUpField,
  submitSignUp,
  uniquePassword,
  uniqueUsername,
} from './support/accounts';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import {
  countGuestsNamed,
  countLiveSessionsFor,
  countSessionsFor,
  enterAsGuest,
  greetingFor,
  readSessionToken,
  sessionCookieName,
  setSessionCookie,
  uniqueName,
} from './support/guests';
import { createRoom } from './support/rooms';

const phcScrypt = /^\$scrypt\$ln=16,r=8,p=2\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/;
const errorOf = (page: Page, field: keyof typeof signUpField) => page.locator(`#signup-${field}-error`);
const accountNavigation = (page: Page) => page.getByRole('navigation', { name: fr.AccountBar.label });

test.describe('opening "Créer un compte"', () => {
  test('the account bar link leads to the sign up page with its French heading and title', async ({ page }) => {
    await page.goto('/');
    await accountNavigation(page).getByRole('link', { name: fr.AccountBar.signUp }).click();
    await expect(page).toHaveURL('/signup');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.SignUp.heading);
    await expect(page).toHaveTitle(fr.Metadata.signUpTitle);
    await expect(accountNavigation(page).getByRole('link', { name: fr.AccountBar.signUp })).toHaveAttribute('aria-current', 'page');
  });

  test('before the form, the page says no email is needed and a forgotten password cannot be recovered', async ({ page }) => {
    await page.goto('/signup');
    const form = page.locator('main form');
    for (const notice of [fr.SignUp.noticeNoEmail, fr.SignUp.noticeNoRecovery]) {
      const text = page.getByText(notice, { exact: true });
      await expect(text).toBeVisible();
      const isBeforeForm = await text.evaluate(
        (node, formNode) => Boolean(node.compareDocumentPosition(formNode!) & Node.DOCUMENT_POSITION_FOLLOWING),
        await form.elementHandle(),
      );
      expect(isBeforeForm, notice).toBe(true);
    }
  });

  test('the form asks only for a username, a password and its confirmation', async ({ page }) => {
    await page.goto('/signup');
    const visibleInputs = page.locator('form input:not([type=hidden])');
    await expect(visibleInputs).toHaveCount(3);
    await expect(signUpField.username(page)).toHaveAttribute('type', 'text');
    await expect(signUpField.username(page)).toHaveAttribute('autocomplete', 'username');
    await expect(signUpField.password(page)).toHaveAttribute('type', 'password');
    await expect(signUpField.confirmation(page)).toHaveAttribute('type', 'password');
    await expect(page.locator('input[type=email], input[autocomplete=email]')).toHaveCount(0);
  });
});

test.describe('creating an account', () => {
  test('a free username and a valid password log Maya in and the header shows her username', async ({ page, context }) => {
    const username = uniqueUsername();
    await signUp(page, { username, password: uniquePassword() });
    await expect(accountNavigation(page)).toHaveText(accountLabel(username));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(greetingFor(username));
    await expect(page.getByText(fr.Play.guestLabel, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: fr.AccountBar.logOut })).toBeVisible();

    await page.reload();
    await expect(accountNavigation(page)).toHaveText(accountLabel(username));

    const account = await findAccount(username);
    expect(account).toMatchObject({ username, trainerName: username });
    expect(await findSessionRow(await readSessionToken(context))).toEqual({ guestId: account!.guestId, userId: account!.userId });
  });

  test('the account session cookie is httpOnly, lax and lasts only for the browser session', async ({ page, context }) => {
    await signUp(page, { username: uniqueUsername(), password: uniquePassword() });
    const cookie = (await context.cookies()).find(({ name }) => name === sessionCookieName)!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Lax');
    expect(cookie.expires).toBe(-1);
  });

  test('usernames of exactly 3 and 20 characters are accepted, and surrounding spaces are trimmed', async ({ browser }) => {
    const suffix = uniqueName().slice(0, 7);
    for (const [typed, stored] of [
      [`M${suffix.slice(0, 2)}`, `M${suffix.slice(0, 2)}`],
      [`Maya_${suffix}${'x'.repeat(8)}`, `Maya_${suffix}${'x'.repeat(8)}`],
      [`  Leo_${suffix}  `, `Leo_${suffix}`],
    ]) {
      const page = await (await browser.newContext()).newPage();
      await signUp(page, { username: typed!, password: uniquePassword() });
      await expect(accountNavigation(page)).toHaveText(accountLabel(stored!));
      await page.context().close();
    }
  });

  test('signing up as a guest keeps the guest identity, renames it, and replaces the guest session', async ({ page, context }) => {
    const guestName = uniqueName('Maya ');
    await enterAsGuest(page, guestName);
    const guestToken = await readSessionToken(context);
    const guestSession = await findSessionRow(guestToken);
    const roomId = await createRoom(page);

    const username = uniqueUsername();
    await signUp(page, { username, password: uniquePassword() });
    const account = await findAccount(username);
    expect(account!.guestId).toBe(guestSession!.guestId);
    expect(await countSessionsFor(guestToken)).toBe(1);
    expect(await countLiveSessionsFor(guestToken)).toBe(0);
    expect(await readSessionToken(context)).not.toBe(guestToken);
    expect(await countGuestsNamed(guestName)).toBe(0);

    await page.goto(`/rooms/${roomId}`);
    await expect(page.getByRole('list').getByRole('listitem')).toContainText(username);
    await expect(page.getByRole('list').getByRole('listitem')).toContainText(fr.Room.hostBadge);
    await expect(accountNavigation(page)).toHaveText(accountLabel(username));
  });

  test('the replaced guest token no longer opens anything', async ({ browser, page, context }) => {
    await enterAsGuest(page, uniqueName('Maya '));
    const guestToken = await readSessionToken(context);
    await signUp(page, { username: uniqueUsername(), password: uniquePassword() });

    const replay = await browser.newContext();
    await setSessionCookie(replay, guestToken);
    const replayPage = await replay.newPage();
    await replayPage.goto('/play');
    await expect(replayPage).toHaveURL('/');
    await replay.close();
  });

  test('an account opening the sign up page is sent to the play page', async ({ page }) => {
    await signUp(page, { username: uniqueUsername(), password: uniquePassword() });
    await page.goto('/signup');
    await expect(page).toHaveURL('/play');
  });

  test('"Se déconnecter" ends the account session and shows the guest form again', async ({ page, context }) => {
    await signUp(page, { username: uniqueUsername(), password: uniquePassword() });
    const token = await readSessionToken(context);
    await page.getByRole('button', { name: fr.AccountBar.logOut }).click();
    await expect(page).toHaveURL('/');
    expect(await countSessionsFor(token)).toBe(0);
    await expect(accountNavigation(page).getByRole('link', { name: fr.AccountBar.signUp })).toBeVisible();
  });
});

test.describe('a username already taken', () => {
  test('"maya" is refused when the seeded account "Maya" exists, and nothing is saved', async ({ page }) => {
    const seeded = seedAccounts[0]!.username;
    await submitSignUp(page, { username: seeded.toLowerCase(), password: uniquePassword() });
    await expect(errorOf(page, 'username')).toHaveText(fr.SignUp.errors.username.taken);
    await expect(signUpField.username(page)).toBeFocused();
    expect(await countUsersNamed(seeded)).toBe(1);
  });

  test('the same name in another letter case is refused, the guest session and its cookie stay unchanged', async ({
    browser,
    page,
    context,
  }) => {
    const username = uniqueUsername('maya_');
    const first = await (await browser.newContext()).newPage();
    await signUp(first, { username, password: uniquePassword() });
    await first.context().close();

    const guestName = uniqueName('Zoe ');
    await enterAsGuest(page, guestName);
    const guestToken = await readSessionToken(context);
    await submitSignUp(page, { username: username.toUpperCase(), password: uniquePassword() });
    await expect(errorOf(page, 'username')).toHaveText(fr.SignUp.errors.username.taken);
    await expect(page).toHaveURL('/signup');
    expect(await countUsersNamed(username)).toBe(1);
    expect(await readSessionToken(context)).toBe(guestToken);
    expect(await findSessionRow(guestToken)).toMatchObject({ userId: null });
    expect(await countGuestsNamed(guestName)).toBe(1);
  });
});

test.describe('refusing invalid entries', () => {
  const unique = uniqueName().slice(0, 6);
  const cases: {
    title: string;
    username: string;
    password: string;
    confirmation?: string;
    field: keyof typeof signUpField;
    message: string;
  }[] = [
    {
      title: 'a password of 7 characters',
      username: `Pw7_${unique}`,
      password: '1234567',
      field: 'password',
      message: fr.SignUp.errors.password.tooShort.replace('{min}', '8'),
    },
    {
      title: 'an empty password',
      username: `Pw0_${unique}`,
      password: '',
      confirmation: 'x',
      field: 'password',
      message: fr.SignUp.errors.password.required,
    },
    {
      title: 'a password of 129 characters',
      username: `Pw129_${unique}`,
      password: 'a'.repeat(129),
      field: 'password',
      message: fr.SignUp.errors.password.tooLong.replace('{max}', '128'),
    },
    {
      title: 'a different confirmation',
      username: `Mis_${unique}`,
      password: 'secret-123',
      confirmation: 'secret-124',
      field: 'confirmation',
      message: fr.SignUp.errors.confirmation.mismatch,
    },
    {
      title: 'an empty confirmation',
      username: `Conf_${unique}`,
      password: 'secret-123',
      confirmation: '',
      field: 'confirmation',
      message: fr.SignUp.errors.confirmation.required,
    },
    {
      title: 'a username of 2 characters',
      username: 'Ab',
      password: 'secret-123',
      field: 'username',
      message: fr.SignUp.errors.username.length.replace('{min}', '3').replace('{max}', '20'),
    },
    {
      title: 'a username of 21 characters',
      username: `U${unique}${'x'.repeat(14)}`,
      password: 'secret-123',
      field: 'username',
      message: fr.SignUp.errors.username.length.replace('{min}', '3').replace('{max}', '20'),
    },
    {
      title: 'an accented username',
      username: `Zoé${unique}`,
      password: 'secret-123',
      field: 'username',
      message: fr.SignUp.errors.username.characters,
    },
    {
      title: 'a username with a space',
      username: `a b${unique}`,
      password: 'secret-123',
      field: 'username',
      message: fr.SignUp.errors.username.characters,
    },
    {
      title: 'a username with markup',
      username: `<b>${unique}</b>`,
      password: 'secret-123',
      field: 'username',
      message: fr.SignUp.errors.username.characters,
    },
  ];

  for (const { title, username, password, confirmation, field, message } of cases) {
    test(`${title} shows which rule failed on its field and saves nothing`, async ({ page, context }) => {
      await submitSignUp(page, { username, password, confirmation });
      await expect(errorOf(page, field)).toHaveText(message);
      await expect(signUpField[field](page)).toHaveAttribute('aria-invalid', 'true');
      await expect(signUpField[field](page)).toHaveAccessibleDescription(new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      await expect(signUpField[field](page)).toBeFocused();
      await expect(page).toHaveURL('/signup');
      await expect(signUpField.username(page)).toHaveValue(username);
      await expect(signUpField.password(page)).toHaveValue('');
      await expect(signUpField.confirmation(page)).toHaveValue('');
      expect(await countUsersNamed(username.trim())).toBe(0);
      expect((await context.cookies()).some((cookie) => cookie.name === sessionCookieName)).toBe(false);
    });
  }

  test('several failed rules are shown at once and focus goes to the first invalid field', async ({ page }) => {
    await submitSignUp(page, { username: 'Ab', password: 'short', confirmation: 'other' });
    await expect(errorOf(page, 'username')).toBeVisible();
    await expect(errorOf(page, 'password')).toBeVisible();
    await expect(errorOf(page, 'confirmation')).toBeVisible();
    await expect(signUpField.username(page)).toBeFocused();

    await fillSignUp(page, { username: uniqueUsername(), password: 'short', confirmation: 'short' });
    await expect(errorOf(page, 'username')).toHaveCount(0);
    await expect(errorOf(page, 'password')).toBeVisible();
    await expect(signUpField.password(page)).toBeFocused();
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('the server shows the French rule and keeps the username', async ({ page }) => {
      await submitSignUp(page, { username: 'Ab', password: 'secret-123', confirmation: 'secret-124' });
      await expect(errorOf(page, 'username')).toHaveText(fr.SignUp.errors.username.length.replace('{min}', '3').replace('{max}', '20'));
      await expect(errorOf(page, 'confirmation')).toHaveText(fr.SignUp.errors.confirmation.mismatch);
      await expect(signUpField.username(page)).toHaveValue('Ab');
    });

    test('a valid entry creates the account and shows the play page', async ({ page }) => {
      const username = uniqueUsername();
      await signUp(page, { username, password: uniquePassword() });
      await expect(accountNavigation(page)).toHaveText(accountLabel(username));
    });
  });
});

test.describe('the stored password', () => {
  test('is kept only as a salted scrypt hash, and the same password gives different hashes', async ({ browser }) => {
    const password = uniquePassword();
    const usernames = [uniqueUsername(), uniqueUsername('Leo_')];
    for (const username of usernames) {
      const page = await (await browser.newContext()).newPage();
      await signUp(page, { username, password });
      await page.context().close();
    }
    const [first, second] = await Promise.all(usernames.map(findAccount));
    expect(first!.passwordHash).toMatch(phcScrypt);
    expect(second!.passwordHash).toMatch(phcScrypt);
    expect(first!.passwordHash).not.toBe(second!.passwordHash);
    expect(first!.passwordHash).not.toContain(password);
  });
});

test.describe('French interface when signing up', () => {
  test('every visible string on the sign up page, empty and with each kind of error, is a French catalog value', async ({ page }) => {
    await page.goto('/signup');
    await expectEveryVisibleStringFromCatalog(page);
    await submitSignUp(page, { username: 'Ab', password: 'short', confirmation: 'other' });
    await expect(errorOf(page, 'confirmation')).toBeVisible();
    await expectEveryVisibleStringFromCatalog(page, ['Ab']);
    await submitSignUp(page, { username: seedAccounts[1]!.username.toUpperCase(), password: uniquePassword() });
    await expect(errorOf(page, 'username')).toHaveText(fr.SignUp.errors.username.taken);
    await expectEveryVisibleStringFromCatalog(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('every visible string on the play and room pages of an account is a French catalog value', async ({ page }) => {
    const username = uniqueUsername();
    await signUp(page, { username, password: uniquePassword() });
    await expectEveryVisibleStringFromCatalog(page);
    await createRoom(page);
    await expectEveryVisibleStringFromCatalog(page, [username]);
  });

  test('a browser asking for English still signs up in French', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US', extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' } });
    const page = await context.newPage();
    await submitSignUp(page, { username: 'Ab', password: uniquePassword() });
    await expect(errorOf(page, 'username')).toHaveText(fr.SignUp.errors.username.length.replace('{min}', '3').replace('{max}', '20'));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.SignUp.heading);
    await context.close();
  });

  test('the sign up page and its errors fit a 320 px wide screen without horizontal scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await submitSignUp(page, { username: 'Ab', password: 'short', confirmation: 'other' });
    await expect(errorOf(page, 'confirmation')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
});
