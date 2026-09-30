import { randomUUID } from 'node:crypto';
import { expect, test, type Browser, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { createSessionToken } from '../../src/server/sessions/session-token';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { enterAsGuest, insertSession, readSessionToken, uniqueName } from './support/guests';
import {
  captureCreateRoomSubmission,
  countMembersOf,
  countRoomsHostedBy,
  createRoom,
  playerCountText,
  redirectTarget,
} from './support/rooms';
import { headersWithout } from './support/submissions';

const stackTracePattern = /stack|\bat .*\.(t|j)sx?:\d+|node_modules|Error:|webpack|turbopack/i;

const playerList = (page: Page) => page.getByRole('list');
const status = (page: Page) => page.getByRole('status');

async function openRoomAsNewGuest(page: Page, trainerName: string): Promise<string> {
  await enterAsGuest(page, trainerName);
  return createRoom(page);
}

async function expectRoomNotFound(page: Page, path: string): Promise<string> {
  const response = await page.goto(path);
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.Room.notFoundHeading);
  await expect(page.getByRole('link', { name: fr.Room.backToPlay })).toHaveAttribute('href', '/play');
  await expect(page.locator('body')).not.toContainText(stackTracePattern);
  return page.locator('main').innerText();
}

async function newGuestPage(browser: Browser, trainerName: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await enterAsGuest(page, trainerName);
  return page;
}

test.describe('creating a room', () => {
  test('Alex lands on his own waiting room as the only player and the host', async ({ page }) => {
    const alex = uniqueName('Alex ');
    const roomId = await openRoomAsNewGuest(page, alex);

    await expect(page).toHaveTitle(fr.Metadata.roomTitle);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.Room.heading);
    await expect(page.getByText(playerCountText(1), { exact: true })).toBeVisible();
    await expect(playerList(page).getByRole('listitem')).toHaveCount(1);
    const alexRow = playerList(page).getByRole('listitem').filter({ hasText: alex });
    await expect(alexRow).toContainText(fr.Room.hostBadge);
    await expect(alexRow).toContainText(fr.Room.youMarker);
    await expect(page.getByText(fr.Room.inviteHint)).toBeVisible();
    expect(await countMembersOf(roomId)).toBe(1);
  });

  test('two rooms created by the same guest have different addresses', async ({ page }) => {
    const alex = uniqueName('Alex ');
    const first = await openRoomAsNewGuest(page, alex);
    await page.goto('/play');
    const second = await createRoom(page);
    expect(second).not.toBe(first);
    expect(await countRoomsHostedBy(alex)).toBe(2);
  });

  test('refreshing keeps Alex listed exactly once and still the host', async ({ page }) => {
    const alex = uniqueName('Alex ');
    const roomId = await openRoomAsNewGuest(page, alex);
    for (let refresh = 0; refresh < 2; refresh += 1) {
      await page.reload();
      await expect(page.getByText(playerCountText(1), { exact: true })).toBeVisible();
      const alexRow = playerList(page).getByRole('listitem').filter({ hasText: alex });
      await expect(alexRow).toHaveCount(1);
      await expect(alexRow).toContainText(fr.Room.hostBadge);
    }
    expect(await countMembersOf(roomId)).toBe(1);
    expect(await countRoomsHostedBy(alex)).toBe(1);
  });

  test('the play page button works without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const alex = uniqueName('Alex ');
    await enterAsGuest(page, alex);
    await createRoom(page);
    await expect(page.getByText(playerCountText(1), { exact: true })).toBeVisible();
    await context.close();
  });
});

test.describe('copying the room link', () => {
  test.describe('with clipboard access', () => {
    test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

    test('a second click restarts the confirmation', async ({ page }) => {
      await openRoomAsNewGuest(page, uniqueName('Alex '));
      const copyButton = page.getByRole('button', { name: fr.Room.copyLink });
      await copyButton.click();
      await expect(status(page)).toHaveText(fr.Room.copied);
      await page.waitForTimeout(2_000);
      await copyButton.click();
      await page.waitForTimeout(2_000);
      await expect(status(page)).toHaveText(fr.Room.copied);
    });

    test('puts the room address on the clipboard and confirms briefly', async ({ page }) => {
      await openRoomAsNewGuest(page, uniqueName('Alex '));
      await expect(status(page)).toBeEmpty();
      await page.getByRole('button', { name: fr.Room.copyLink }).click();
      await expect(status(page)).toHaveText(fr.Room.copied);
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
      await expect(status(page)).toBeEmpty({ timeout: 6_000 });
    });
  });

  test('when the clipboard is refused, the address is shown selected in a field', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } });
    });
    await openRoomAsNewGuest(page, uniqueName('Alex '));
    await page.getByRole('button', { name: fr.Room.copyLink }).click();
    await expect(status(page)).toHaveText(fr.Room.copyFailed);
    const field = page.getByLabel(fr.Room.linkLabel);
    await expect(field).toHaveValue(page.url());
    await expect(field).toBeFocused();
  });
});

test.describe('room addresses that show "Salle introuvable"', () => {
  const unusableIds: [string, string][] = [
    ['a malformed identifier', 'not-a-uuid'],
    ['a lone percent sign', '%'],
    ['a broken percent sequence', '%E0%A4%A'],
    ['a 2000 character identifier', 'a'.repeat(2000)],
    ['an uppercase identifier', randomUUID().toUpperCase()],
    ['an unknown identifier', randomUUID()],
  ];

  for (const [label, roomId] of unusableIds) {
    test(`${label} answers 404 in French for a guest`, async ({ page }) => {
      await enterAsGuest(page, uniqueName('Alex '));
      await expectRoomNotFound(page, `/rooms/${roomId}`);
    });
  }

  test('a guestless visitor gets the same 404 for an unknown room', async ({ page }) => {
    await expectRoomNotFound(page, `/rooms/${randomUUID()}`);
  });

  test('a guest who is not a member gets the same page as for an unknown room, with no trace of the room', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const roomId = await openRoomAsNewGuest(page, alex);
    const zoePage = await newGuestPage(browser, uniqueName('Zoe '));

    const stranger = await expectRoomNotFound(zoePage, `/rooms/${roomId}`);
    const unknown = await expectRoomNotFound(zoePage, `/rooms/${randomUUID()}`);
    expect(stranger).toBe(unknown);
    expect(await zoePage.content()).not.toContain(alex);
    await zoePage.context().close();
  });

  test('a guestless visitor opening a real room is sent to the entry page without seeing it', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const roomId = await openRoomAsNewGuest(page, alex);
    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto(`/rooms/${roomId}`);
    await expect(visitor).toHaveURL('/');
    expect(await visitor.content()).not.toContain(alex);
    await visitor.context().close();
  });

  test('the play link leads back to the play page', async ({ page }) => {
    await enterAsGuest(page, uniqueName('Alex '));
    await expectRoomNotFound(page, '/rooms/not-a-uuid');
    await page.getByRole('link', { name: fr.Room.backToPlay }).click();
    await expect(page).toHaveURL('/play');
  });
});

test.describe('creating a room without a guest session', () => {
  test('is refused with a redirect to the entry page and creates no room', async ({ page, request }) => {
    const alex = uniqueName('Alex ');
    await enterAsGuest(page, alex);
    const captured = await captureCreateRoomSubmission(page);
    const validToken = await readSessionToken(page.context());
    const expiredToken = createSessionToken();
    await insertSession(expiredToken, uniqueName('Old '), new Date(Date.now() - 60_000));

    const cookies: Record<string, string | null> = {
      'no cookie': null,
      'a malformed cookie': 'poketype_session=not-a-token',
      'an expired session': `poketype_session=${expiredToken}`,
    };
    for (const [label, cookie] of Object.entries(cookies)) {
      const headers = cookie ? { ...captured.headers, cookie } : captured.headers;
      const response = await request.post('/play', { headers, data: captured.body, maxRedirects: 0 });
      expect(redirectTarget(response), label).toBe('/');
    }
    expect(await countRoomsHostedBy(alex)).toBe(0);

    const control = await request.post('/play', {
      headers: { ...captured.headers, cookie: `poketype_session=${validToken}` },
      data: captured.body,
      maxRedirects: 0,
    });
    expect(redirectTarget(control), 'control: the valid session creates a room').toMatch(/^\/rooms\//);
    expect(await countRoomsHostedBy(alex)).toBe(1);
  });

  test('after "Changer de dresseur", the old cookie can no longer create a room', async ({ page, request }) => {
    const alex = uniqueName('Alex ');
    await enterAsGuest(page, alex);
    const captured = await captureCreateRoomSubmission(page);
    const oldToken = await readSessionToken(page.context());
    await page.unroute('**/play');
    await page.goto('/play');
    await page.getByRole('button', { name: fr.Play.leave }).click();
    await expect(page).toHaveURL('/');

    const response = await request.post('/play', {
      headers: { ...captured.headers, cookie: `poketype_session=${oldToken}` },
      data: captured.body,
      maxRedirects: 0,
    });
    expect(redirectTarget(response)).toBe('/');
    expect(await countRoomsHostedBy(alex)).toBe(0);
  });

  test('a POST without an Origin header is refused by the proxy', async ({ page, request }) => {
    const alex = uniqueName('Alex ');
    await enterAsGuest(page, alex);
    const captured = await captureCreateRoomSubmission(page);
    const withoutOrigin = headersWithout(captured.headers, ['origin']);
    const cookie = `poketype_session=${await readSessionToken(page.context())}`;
    const response = await request.post('/play', { headers: { ...withoutOrigin, cookie }, data: captured.body, maxRedirects: 0 });
    expect(response.status()).toBe(403);
    expect(await countRoomsHostedBy(alex)).toBe(0);
  });
});

test.describe('French interface', () => {
  test('every visible string on the room page is a French catalog value', async ({ page }) => {
    const alex = uniqueName('Alex ');
    await openRoomAsNewGuest(page, alex);
    await expectEveryVisibleStringFromCatalog(page, [alex]);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('every visible string on the room 404 is a French catalog value', async ({ page }) => {
    await enterAsGuest(page, uniqueName('Alex '));
    await expectRoomNotFound(page, '/rooms/not-a-uuid');
    await expectEveryVisibleStringFromCatalog(page);
    await expect(page).toHaveTitle(fr.Metadata.roomNotFoundTitle);
  });

  test('the room page fits a 320px screen and keeps a long name inside', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await openRoomAsNewGuest(page, 'W'.repeat(16));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
