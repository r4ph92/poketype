import { randomUUID } from 'node:crypto';
import { expect, test, type Browser, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { hashSessionToken } from '../../src/server/sessions/session-token';
import { enterAsGuest, readSessionToken, uniqueName, withTestDatabase } from './support/guests';
import { countMembersOf, countRoomsHostedBy, createRoom, playerCountText } from './support/rooms';

const status = (page: Page) => page.getByRole('status');
const copyButton = (page: Page) => page.getByRole('button', { name: fr.Room.copyLink });
const playerRows = (page: Page) => page.getByRole('list').getByRole('listitem');

async function openRoomAsNewGuest(page: Page, trainerName: string): Promise<string> {
  await enterAsGuest(page, trainerName);
  return createRoom(page);
}

async function newGuestPage(browser: Browser, trainerName: string, javaScriptEnabled = true): Promise<Page> {
  const page = await (await browser.newContext({ javaScriptEnabled })).newPage();
  await enterAsGuest(page, trainerName);
  return page;
}

async function addMemberToRoom(roomId: string, trainerName: string): Promise<void> {
  await withTestDatabase(async (sql) => {
    await sql`insert into room_members (room_id, guest_id) select ${roomId}, id from guests where trainer_name = ${trainerName}`;
  });
}

async function expireSession(token: string): Promise<void> {
  await withTestDatabase(async (sql) => {
    await sql`update sessions set expires_at = now() - interval '1 minute' where token_hash = ${hashSessionToken(token)}`;
  });
}

async function expectServerSentRoomNotFound(page: Page, path: string): Promise<void> {
  const response = await page.goto(path);
  expect(response?.status()).toBe(404);
  expect(await response!.text()).toContain(`<title>${fr.Metadata.roomNotFoundTitle}</title>`);
}

test.describe('"Salle introuvable" without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  const addresses: [string, string][] = [
    ['a malformed room address', '/rooms/not-a-uuid'],
    ['an undecodable room address', '/rooms/%'],
    ['an unknown room address', `/rooms/${randomUUID()}`],
  ];

  for (const [label, path] of addresses) {
    test(`${label} answers 404 with the French title in the server HTML`, async ({ page }) => {
      await expectServerSentRoomNotFound(page, path);
    });
  }

  test("another guest's room answers 404 with the French title in the server HTML for Zoe", async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const zoePage = await newGuestPage(browser, uniqueName('Zoe '), false);
    await expectServerSentRoomNotFound(zoePage, `/rooms/${roomId}`);
    await zoePage.context().close();
  });
});

test.describe('creating a room under pressure', () => {
  test('clicking "Créer une salle" three times while the server is slow creates one room', async ({ page }) => {
    const alex = uniqueName('Alex ');
    await enterAsGuest(page, alex);
    await page.route('**/play', async (route) => {
      if (route.request().method() === 'POST') await new Promise((resolve) => setTimeout(resolve, 1_500));
      return route.continue();
    });
    const button = page.getByRole('button', { name: fr.Play.createRoom });
    await button.click();
    await expect(button).toHaveAttribute('aria-disabled', 'true');
    await button.click({ force: true });
    await button.click({ force: true });
    await expect(page).toHaveURL(/\/rooms\//);
    await expect(page.getByText(playerCountText(1), { exact: true })).toBeVisible();
    expect(await countRoomsHostedBy(alex)).toBe(1);
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('refreshing the new room, going back and forward never submits the form again', async ({ page }) => {
      const alex = uniqueName('Alex ');
      const roomId = await openRoomAsNewGuest(page, alex);
      await page.reload();
      await page.goBack();
      await expect(page).toHaveURL('/play');
      await page.goForward();
      await expect(page).toHaveURL(`/rooms/${roomId}`);
      await expect(page.getByText(playerCountText(1), { exact: true })).toBeVisible();
      expect(await countRoomsHostedBy(alex)).toBe(1);
      expect(await countMembersOf(roomId)).toBe(1);
    });
  });
});

test.describe('copying the room link again', () => {
  test('without any clipboard API, as on a page served over plain HTTP, the address is shown selected', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'clipboard', { get: () => undefined, configurable: true });
    });
    await openRoomAsNewGuest(page, uniqueName('Alex '));
    await copyButton(page).click();
    await expect(status(page)).toHaveText(fr.Room.copyFailed);
    const field = page.getByLabel(fr.Room.linkLabel);
    await expect(field).toHaveValue(page.url());
    await expect(field).toBeFocused();
  });

  test('copying again after the clipboard was refused selects the address again', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } });
    });
    await openRoomAsNewGuest(page, uniqueName('Alex '));
    await copyButton(page).click();
    const field = page.getByLabel(fr.Room.linkLabel);
    await expect(field).toBeFocused();
    await page.getByRole('heading', { level: 1 }).click();
    await copyButton(page).click();
    await expect(field).toBeFocused();
  });
});

test.describe('room page after the session ends', () => {
  test('after "Changer de dresseur" in another tab, the room tab and a stale play tab lead to the entry page and create nothing', async ({
    page,
  }) => {
    const alex = uniqueName('Alex ');
    const roomId = await openRoomAsNewGuest(page, alex);
    const stalePlayTab = await page.context().newPage();
    await stalePlayTab.goto('/play');
    const otherTab = await page.context().newPage();
    await otherTab.goto('/play');
    await otherTab.getByRole('button', { name: fr.Play.leave }).click();
    await expect(otherTab).toHaveURL('/');

    await page.reload();
    await expect(page).toHaveURL('/');
    await expect(page.locator('body')).not.toContainText(alex);

    await stalePlayTab.getByRole('button', { name: fr.Play.createRoom }).click();
    await expect(stalePlayTab).toHaveURL('/');
    expect(await countRoomsHostedBy(alex)).toBe(1);
    expect(await countMembersOf(roomId)).toBe(1);
  });

  test('when the session has expired, opening the room leads to the entry page, and re-entering with the same name does not reopen it', async ({
    page,
  }) => {
    const alex = uniqueName('Alex ');
    const roomId = await openRoomAsNewGuest(page, alex);
    await expireSession(await readSessionToken(page.context()));

    await page.reload();
    await expect(page).toHaveURL('/');
    await expect(page.locator('body')).not.toContainText(alex);

    await enterAsGuest(page, alex);
    const response = await page.goto(`/rooms/${roomId}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.Room.notFoundHeading);
  });
});

test.describe('a room with two members', () => {
  test('the host badge stays on Alex, each player sees "Toi" on their own row, and the count reads 2 joueurs', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const zoe = uniqueName('Zoé ');
    const roomId = await openRoomAsNewGuest(page, alex);
    const zoePage = await newGuestPage(browser, zoe);
    await addMemberToRoom(roomId, zoe);

    for (const [viewer, viewerName] of [
      [page, alex],
      [zoePage, zoe],
    ] as const) {
      await viewer.goto(`/rooms/${roomId}`);
      await expect(viewer.getByText(playerCountText(2), { exact: true })).toBeVisible();
      await expect(playerRows(viewer)).toHaveCount(2);
      await expect(playerRows(viewer).first()).toContainText(alex);
      await expect(playerRows(viewer).filter({ hasText: fr.Room.hostBadge })).toHaveCount(1);
      await expect(playerRows(viewer).filter({ hasText: fr.Room.hostBadge })).toContainText(alex);
      await expect(playerRows(viewer).filter({ hasText: fr.Room.youMarker })).toHaveCount(1);
      await expect(playerRows(viewer).filter({ hasText: fr.Room.youMarker })).toContainText(viewerName);
    }
    await zoePage.context().close();
  });
});
