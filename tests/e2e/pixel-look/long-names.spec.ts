import { randomUUID } from 'node:crypto';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import fr from '../../../messages/fr.json';
import { maxDisplayNameLength } from '../../../src/config/game';
import { signUp, uniquePassword } from '../support/accounts';
import { enterAsGuest, uniqueName } from '../support/guests';
import { createRoom, roomPagePath } from '../support/rooms';

type Box = { x: number; y: number; width: number; height: number };

const widths = [320, 375, 1440];

function usernameAtLimit(run: string): string {
  const suffix = randomUUID().replaceAll('-', '');
  return `${run}${suffix}`.slice(0, maxDisplayNameLength);
}

function overlaps(first: Box, second: Box): boolean {
  return first.x < second.x + second.width && second.x < first.x + first.width && first.y < second.y + second.height && second.y < first.y + first.height;
}

function contains(outer: Box, inner: Box): boolean {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;
}

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box, 'element is rendered').not.toBeNull();
  return box!;
}

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function expectRosterRowsFit(page: Page, names: string[]): Promise<void> {
  const panel = await boxOf(page.locator('section[aria-labelledby="players-heading"]'));
  for (const name of names) {
    const row = page.getByRole('listitem').filter({ hasText: name });
    expect(contains(panel, await boxOf(row))).toBe(true);
    const nameBox = await boxOf(row.getByText(name, { exact: true }));
    const badges = await row.getByText(new RegExp(`^(${fr.Room.hostBadge}|${fr.Room.youMarker})$`)).all();
    for (const badge of badges) expect(overlaps(nameBox, await boxOf(badge))).toBe(false);
  }
}

async function expectHeaderIdentityFits(page: Page): Promise<void> {
  const banner = page.getByRole('banner');
  const identity = banner.getByRole('navigation', { name: fr.AccountBar.label }).locator('p');
  expect(await identity.evaluate((element) => getComputedStyle(element).textOverflow)).toBe('ellipsis');
  const identityBox = await boxOf(identity);
  expect(contains(await boxOf(banner), identityBox)).toBe(true);
  const neighbours = [banner.getByRole('link', { name: fr.Header.wordmark }), banner.getByRole('link', { name: fr.Header.tabs.race }), ...(await banner.getByRole('button').all())];
  for (const neighbour of neighbours) expect(overlaps(identityBox, await boxOf(neighbour))).toBe(false);
}

async function expectGreetingInsidePanel(page: Page): Promise<void> {
  await page.goto('/play');
  expect(contains(await boxOf(page.locator('section').first()), await boxOf(page.getByRole('heading', { level: 1 })))).toBe(true);
}

async function newPlayer(browser: Browser): Promise<Page> {
  return (await browser.newContext()).newPage();
}

async function openSharedRoom(host: Page, guest: Page): Promise<string> {
  await host.goto('/play');
  const roomId = await createRoom(host);
  await guest.goto(roomPagePath(roomId));
  await expect(host.getByRole('list').getByRole('listitem')).toHaveCount(2, { timeout: 6_000 });
  return roomId;
}

test.describe('long trainer names', () => {
  test('the 16-character guest name "Maximilien-Anne1" wraps in the room list without overlapping', async ({ browser }) => {
    const [host, guest] = [await newPlayer(browser), await newPlayer(browser)];
    const names = ['Maximilien-Anne1', uniqueName('Zoe ')];
    await enterAsGuest(host, names[0]!);
    await enterAsGuest(guest, names[1]!);
    await openSharedRoom(host, guest);
    for (const width of widths) {
      await host.setViewportSize({ width, height: 900 });
      await expectRosterRowsFit(host, names);
      await expectNoHorizontalScroll(host);
    }
    await expectGreetingInsidePanel(host);
  });

  test('account names at the longest allowed length truncate in the header and wrap in the room list', async ({ browser }) => {
    const usernames = [usernameAtLimit('W'.repeat(12)), usernameAtLimit('Maximilienne_')];
    usernames.forEach((username) => expect(username).toHaveLength(maxDisplayNameLength));
    const [host, guest] = [await newPlayer(browser), await newPlayer(browser)];
    await signUp(host, { username: usernames[0]!, password: uniquePassword() });
    await signUp(guest, { username: usernames[1]!, password: uniquePassword() });
    const roomId = await openSharedRoom(host, guest);
    for (const width of widths) {
      for (const page of [host, guest]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(roomPagePath(roomId));
        await expectHeaderIdentityFits(page);
        await expectRosterRowsFit(page, usernames);
        await expectNoHorizontalScroll(page);
        await expectGreetingInsidePanel(page);
        await expectNoHorizontalScroll(page);
      }
    }
  });
});
