import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { enterAsGuest, expireSession, newStaleTab, readSessionToken, uniqueName, withTestDatabase } from './support/guests';
import { confirmCreateRoom, countMembersOf, countRoomsHostedBy, createRoomDialog, invitationStatus, newGuestPage, openRoomAsNewGuest, playerCountText, playerRows, setRoomPhase } from './support/rooms';
import { chooseStarterOnScreen } from './support/trainer';

const copyButton = (page: Page) => page.getByRole('button', { name: fr.Room.copyLink });

async function addMemberToRoom(roomId: string, trainerName: string): Promise<void> {
  await withTestDatabase(async (sql) => {
    await sql`insert into room_members (room_id, guest_id) select ${roomId}, id from guests where trainer_name = ${trainerName}`;
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

  test('a closed room answers 404 with the French title in the server HTML for its host', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    await setRoomPhase(roomId, 'closed');
    await expectServerSentRoomNotFound(page, `/rooms/${roomId}`);
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
    await page.getByRole('button', { name: fr.Play.createRoom }).click();
    const button = createRoomDialog(page).getByRole('button', { name: fr.RoomAccess.confirmCreate });
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
    await expect(invitationStatus(page)).toHaveText(fr.Room.copyFailed);
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
    const stalePlayTab = await newStaleTab(page.context());
    await stalePlayTab.goto('/play');
    const otherTab = await page.context().newPage();
    await otherTab.goto('/play');
    await otherTab.getByRole('button', { name: fr.Play.leave }).click();
    await expect(otherTab).toHaveURL('/');

    await page.reload();
    await expect(page).toHaveURL(`/?room=${roomId}`);
    await expect(page.locator('body')).not.toContainText(alex);

    await stalePlayTab.getByRole('button', { name: fr.Play.createRoom }).click();
    await confirmCreateRoom(stalePlayTab);
    await expect(stalePlayTab).toHaveURL('/');
    expect(await countRoomsHostedBy(alex)).toBe(1);
    expect(await countMembersOf(roomId)).toBe(1);
  });

  test('when the session has expired, opening the room leads to the entry page, and re-entering with the same name joins as a new player', async ({
    page,
  }) => {
    const alex = uniqueName('Alex ');
    const roomId = await openRoomAsNewGuest(page, alex);
    await expireSession(await readSessionToken(page.context()));

    await page.reload();
    await expect(page).toHaveURL(`/?room=${roomId}`);
    await expect(page.locator('body')).not.toContainText(alex);

    await page.getByLabel(fr.GuestEntry.label).fill(alex);
    await page.getByRole('button', { name: fr.GuestEntry.submit }).click();
    await chooseStarterOnScreen(page);
    await expect(page).toHaveURL(`/rooms/${roomId}`);
    await expect(page.getByText(playerCountText(2), { exact: true })).toBeVisible();
    await expect(playerRows(page).first()).toContainText(fr.Room.hostBadge);
    await expect(playerRows(page).first()).not.toContainText(fr.Room.youMarker);
    await expect(playerRows(page).nth(1)).toContainText(fr.Room.youMarker);
    expect(await countMembersOf(roomId)).toBe(2);
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
