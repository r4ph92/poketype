import { randomBytes } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import fr from '../../../messages/fr.json';
import { seedAccounts } from '../../../scripts/seed-accounts';
import { insertAccount } from '../../../src/server/accounts/account-commands';
import { hashPassword } from '../../../src/server/accounts/password-hash';
import type { Database } from '../../../src/server/db/types';
import { hashSessionToken } from '../../../src/server/sessions/session-token';
import { uniquePassword, uniqueUsername } from './accounts';
import { withTestDatabase } from './guests';
import { giveStarter } from './trainer';

export type PasswordAccount = { username: string; password: string; userId: string; guestId: string };

// The account already has its starter, like any account that went through sign-up, so logging in lands on the hub.
export async function createPasswordAccount(database: Database, prefix = 'Login_'): Promise<PasswordAccount> {
  const username = uniqueUsername(prefix);
  const password = uniquePassword();
  const passwordHash = await hashPassword(password);
  const rows = await database.transaction((transaction) => insertAccount(transaction, { username, passwordHash }));
  await giveStarter(rows.guestId);
  return { username, password, ...rows };
}

export async function insertLoginFailures(usernameKey: string, count: number, minutesAgo = 0): Promise<void> {
  await withTestDatabase(async (sql) => {
    for (let index = 0; index < count; index += 1) {
      await sql`insert into login_failures (username_key, failed_at) values (${usernameKey}, now() - make_interval(secs => ${minutesAgo * 60 + index}))`;
    }
  });
}

export async function countLoginFailures(usernameKey: string): Promise<number> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`select count(*)::int as total from login_failures where username_key = ${usernameKey}`;
    return row!.total as number;
  });
}

export async function insertGuestSessionToken(trainerName: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await withTestDatabase(async (sql) => {
    const [guest] = await sql`insert into guests (trainer_name) values (${trainerName}) returning id`;
    await sql`insert into sessions (token_hash, guest_id, expires_at) values (${hashSessionToken(token)}, ${guest!.id}, now() + interval '1 hour')`;
  });
  return token;
}

export const maya = seedAccounts[0]!;

export const logInField = {
  username: (page: Page) => page.getByLabel(fr.SignUp.usernameLabel),
  password: (page: Page) => page.getByLabel(fr.SignUp.passwordLabel, { exact: true }),
};

export const accountNavigation = (page: Page) => page.getByRole('navigation', { name: fr.AccountBar.label });

export const logInAlert = (page: Page) => page.getByRole('main').getByRole('alert');

export async function submitLogIn(page: Page, username: string, password: string, path = '/login'): Promise<void> {
  await page.goto(path);
  await fillLogIn(page, username, password);
}

// Waits for the previous answer to settle (React resets the form then) and for this one, so no attempt is lost to a pending button.
export async function fillLogIn(page: Page, username: string, password: string): Promise<void> {
  const submit = page.getByRole('button', { name: fr.LogIn.submit });
  await expect(submit).toHaveAttribute('aria-disabled', 'false');
  await logInField.username(page).fill(username);
  await logInField.password(page).fill(password);
  const answered = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/login');
  await submit.click();
  await answered;
}

export async function logInAsMaya(page: Page): Promise<void> {
  await submitLogIn(page, maya.username, maya.password);
  await expect(page).toHaveURL('/play', { timeout: 15_000 });
}

export function throttledMessage(): string {
  return fr.LogIn.errors.form.throttled.replace('{minutes}', '5');
}
