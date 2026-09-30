import { randomUUID } from 'node:crypto';
import { expect, type BrowserContext, type Page } from '@playwright/test';
import postgres from 'postgres';
import fr from '../../../messages/fr.json';
import { hashSessionToken } from '../../../src/server/sessions/session-token';

export const sessionCookieName = 'poketype_session';

export function uniqueName(prefix = ''): string {
  return `${prefix}${randomUUID().slice(0, 8)}`;
}

export function greetingFor(name: string): string {
  return fr.Play.greeting.replace('{name}', name);
}

export function lengthErrorMessage(): string {
  return fr.GuestEntry.errors.length.replace('{min}', '2').replace('{max}', '16');
}

export async function submitTrainerName(page: Page, name: string): Promise<void> {
  await page.goto('/');
  await page.getByLabel(fr.GuestEntry.label).fill(name);
  await page.getByRole('button', { name: fr.GuestEntry.submit }).click();
}

export async function enterAsGuest(page: Page, name: string): Promise<void> {
  await submitTrainerName(page, name);
  await expect(page).toHaveURL('/play');
}

export async function readSessionToken(context: BrowserContext): Promise<string> {
  const cookie = (await context.cookies()).find(({ name }) => name === sessionCookieName);
  expect(cookie, 'session cookie').toBeDefined();
  return cookie!.value;
}

export async function setSessionCookie(context: BrowserContext, value: string): Promise<void> {
  await context.addCookies([{ name: sessionCookieName, value, domain: 'localhost', path: '/' }]);
}

export async function withTestDatabase<T>(work: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 1 });
  try {
    return await work(sql);
  } finally {
    await sql.end();
  }
}

export async function countGuestsNamed(name: string): Promise<number> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`select count(*)::int as total from guests where trainer_name = ${name}`;
    return row!.total as number;
  });
}

export async function insertSession(token: string, trainerName: string, expiresAt: Date): Promise<void> {
  await withTestDatabase(async (sql) => {
    const [guest] = await sql`insert into guests (trainer_name) values (${trainerName}) returning id`;
    await sql`insert into sessions (token_hash, guest_id, expires_at) values (${hashSessionToken(token)}, ${guest!.id}, ${expiresAt})`;
  });
}

export async function countSessionsFor(token: string): Promise<number> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`select count(*)::int as total from sessions where token_hash = ${hashSessionToken(token)}`;
    return row!.total as number;
  });
}

export async function sessionLifetimeSeconds(token: string): Promise<number> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`select extract(epoch from expires_at - created_at)::int as seconds from sessions where token_hash = ${hashSessionToken(token)}`;
    return row!.seconds as number;
  });
}
