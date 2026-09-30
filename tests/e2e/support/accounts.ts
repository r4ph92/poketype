import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import fr from '../../../messages/fr.json';
import { hashSessionToken } from '../../../src/server/sessions/session-token';
import { withTestDatabase } from './guests';

export type SignUpEntry = { username: string; password: string; confirmation?: string };

export type AccountRecord = { userId: string; guestId: string; username: string; trainerName: string; passwordHash: string };

export function uniqueUsername(prefix = 'Maya_'): string {
  return `${prefix}${randomUUID().slice(0, 8)}`;
}

export function uniquePassword(): string {
  return `mdp-${randomUUID().slice(0, 12)}`;
}

export function accountLabel(username: string): string {
  return fr.AccountBar.account.replace('{username}', username);
}

export const signUpField = {
  username: (page: Page) => page.getByLabel(fr.SignUp.usernameLabel),
  password: (page: Page) => page.getByLabel(fr.SignUp.passwordLabel, { exact: true }),
  confirmation: (page: Page) => page.getByLabel(fr.SignUp.confirmationLabel),
};

export async function submitSignUp(page: Page, entry: SignUpEntry): Promise<void> {
  await page.goto('/signup');
  await fillSignUp(page, entry);
}

export async function fillSignUp(page: Page, { username, password, confirmation = password }: SignUpEntry): Promise<void> {
  await signUpField.username(page).fill(username);
  await signUpField.password(page).fill(password);
  await signUpField.confirmation(page).fill(confirmation);
  await page.getByRole('button', { name: fr.SignUp.submit }).click();
}

export async function signUp(page: Page, entry: SignUpEntry): Promise<void> {
  await submitSignUp(page, entry);
  await expect(page).toHaveURL('/play');
}

export async function countUsersNamed(username: string): Promise<number> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`select count(*)::int as total from users where lower(username) = lower(${username})`;
    return row!.total as number;
  });
}

export async function findAccount(username: string): Promise<AccountRecord | null> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`
      select users.id as user_id, users.guest_id, users.username, guests.trainer_name, password_credentials.password_hash
      from users
      join guests on guests.id = users.guest_id
      join password_credentials on password_credentials.user_id = users.id
      where lower(users.username) = lower(${username})`;
    if (!row) return null;
    return {
      userId: row.user_id as string,
      guestId: row.guest_id as string,
      username: row.username as string,
      trainerName: row.trainer_name as string,
      passwordHash: row.password_hash as string,
    };
  });
}

export async function findSessionRow(token: string): Promise<{ guestId: string; userId: string | null } | null> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`select guest_id, user_id from sessions where token_hash = ${hashSessionToken(token)}`;
    return row ? { guestId: row.guest_id as string, userId: row.user_id as string | null } : null;
  });
}
