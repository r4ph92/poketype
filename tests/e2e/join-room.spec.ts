import { expect, test, type Browser, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import type { RoomPhase } from '../../src/domain/room-phase';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { uniqueName } from './support/guests';
import {
  countMembersOf,
  newGuestPage,
  openRoomAsNewGuest,
  playerCountText,
  readRoomRevision,
  setRoomPhase,
} from './support/rooms';

const playerRows = (page: Page) => page.getByRole('list').getByRole('listitem');
const roomPath = (roomId: string) => `/rooms/${roomId}`;

async function newVisitorPage(browser: Browser, javaScriptEnabled = true): Promise<Page> {
  return (await browser.newContext({ javaScriptEnabled })).newPage();
}

async function enterFromInvitation(page: Page, trainerName: string): Promise<void> {
  await page.getByLabel(fr.GuestEntry.label).fill(trainerName);
  await page.getByRole('button', { name: fr.GuestEntry.submit }).click();
}

async function expectListed(page: Page, host: string, viewer: string): Promise<void> {
  await expect(page.getByText(playerCountText(2), { exact: true })).toBeVisible();
  await expect(playerRows(page)).toHaveCount(2);
  await expect(playerRows(page).nth(0)).toContainText(host);
  await expect(playerRows(page).nth(0)).toContainText(fr.Room.hostBadge);
  await expect(playerRows(page).filter({ hasText: viewer })).toHaveCount(1);
  await expect(playerRows(page).filter({ hasText: fr.Room.youMarker })).toContainText(viewer);
}

async function expectRaceAlreadyStarted(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.Room.raceStartedHeading);
  await expect(page.getByText(fr.Room.raceStartedMessage)).toBeVisible();
  await expect(page.getByRole('link', { name: fr.Room.backToPlay })).toHaveAttribute('href', '/play');
  await expect(page).toHaveTitle(fr.Metadata.raceStartedTitle);
}

test.describe('joining a room from its link', () => {
  test('Zoe, a guest in another browser, opens the link and is listed after Alex, the host', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const zoe = uniqueName('Zoé ');
    const roomId = await openRoomAsNewGuest(page, alex);
    const revisionBefore = await readRoomRevision(roomId);
    const zoePage = await newGuestPage(browser, zoe);

    const response = await zoePage.goto(roomPath(roomId));
    expect(response?.status()).toBe(200);
    await expectListed(zoePage, alex, zoe);
    expect(await countMembersOf(roomId)).toBe(2);
    expect(await readRoomRevision(roomId)).toBe(revisionBefore + 1);
    await zoePage.context().close();
  });

  test('Zoe without a guest session enters a trainer name first, then lands in that same room', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const zoe = uniqueName('Zoé ');
    const roomId = await openRoomAsNewGuest(page, alex);
    const zoePage = await newVisitorPage(browser);

    await zoePage.goto(roomPath(roomId));
    await expect(zoePage).toHaveURL(`/?room=${roomId}`);
    await expect(zoePage.getByText(fr.Home.joinRoomHint)).toBeVisible();
    await enterFromInvitation(zoePage, zoe);
    await expect(zoePage).toHaveURL(roomPath(roomId));
    await expectListed(zoePage, alex, zoe);
    await zoePage.context().close();
  });

  test('without JavaScript, the trainer name step still leads to the room, even after a rejected name', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const zoe = uniqueName('Zoé ');
    const roomId = await openRoomAsNewGuest(page, alex);
    const zoePage = await newVisitorPage(browser, false);

    await zoePage.goto(roomPath(roomId));
    await enterFromInvitation(zoePage, 'Z');
    await expect(zoePage.getByRole('alert')).toBeVisible();
    await expect(zoePage.getByText(fr.Home.joinRoomHint)).toBeVisible();
    await enterFromInvitation(zoePage, zoe);
    await expect(zoePage).toHaveURL(roomPath(roomId));
    await expectListed(zoePage, alex, zoe);
    await zoePage.context().close();
  });

  test('a guest with a session who follows an invitation address goes straight to the room', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    await zoePage.goto(`/?room=${roomId}`);
    await expect(zoePage).toHaveURL(roomPath(roomId));
    expect(await countMembersOf(roomId)).toBe(2);
    await zoePage.context().close();
  });
});

test.describe('opening the link again', () => {
  test('Zoe opening the link in a second tab is still listed once, and the revision does not move', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const zoe = uniqueName('Zoé ');
    const roomId = await openRoomAsNewGuest(page, alex);
    const zoePage = await newGuestPage(browser, zoe);
    await zoePage.goto(roomPath(roomId));
    const revisionAfterJoin = await readRoomRevision(roomId);

    const secondTab = await zoePage.context().newPage();
    await secondTab.goto(roomPath(roomId));
    for (const viewer of [zoePage, secondTab]) await expectListed(viewer, alex, zoe);
    await page.reload();
    await expectListed(page, alex, alex);
    expect(await countMembersOf(roomId)).toBe(2);
    expect(await readRoomRevision(roomId)).toBe(revisionAfterJoin);
    await zoePage.context().close();
  });

  test('two tabs of a new guest opening the link at the same time add one membership', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    const secondTab = await zoePage.context().newPage();

    await Promise.all([zoePage.goto(roomPath(roomId)), secondTab.goto(roomPath(roomId))]);
    expect(await countMembersOf(roomId)).toBe(2);
    await zoePage.context().close();
  });
});

test.describe('a race that has already started', () => {
  for (const phase of ['countdown', 'racing', 'results'] satisfies RoomPhase[]) {
    test(`during ${phase}, Nina sees "La course a déjà commencé" and is not added`, async ({ browser, page }) => {
      const alex = uniqueName('Alex ');
      const roomId = await openRoomAsNewGuest(page, alex);
      await setRoomPhase(roomId, phase);
      const revisionBefore = await readRoomRevision(roomId);
      const ninaPage = await newGuestPage(browser, uniqueName('Nina '));

      const response = await ninaPage.goto(roomPath(roomId));
      expect(response?.status()).toBe(200);
      await expectRaceAlreadyStarted(ninaPage);
      await expect(ninaPage.locator('body')).not.toContainText(alex);
      expect(await countMembersOf(roomId)).toBe(1);
      expect(await readRoomRevision(roomId)).toBe(revisionBefore);
      await ninaPage.context().close();
    });
  }

  test('a guestless Nina sees the same page without the trainer name step', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    await setRoomPhase(roomId, 'racing');
    const ninaPage = await newVisitorPage(browser);

    await ninaPage.goto(roomPath(roomId));
    await expect(ninaPage).toHaveURL(roomPath(roomId));
    await expectRaceAlreadyStarted(ninaPage);
    expect(await countMembersOf(roomId)).toBe(1);
    await ninaPage.context().close();
  });

  test('Alex, already a member, keeps his room', async ({ page }) => {
    const alex = uniqueName('Alex ');
    const roomId = await openRoomAsNewGuest(page, alex);
    await setRoomPhase(roomId, 'racing');
    await page.reload();
    await expect(playerRows(page)).toHaveCount(1);
    await expect(playerRows(page).first()).toContainText(alex);
  });
});

test.describe('French interface when joining', () => {
  test('the invitation entry page, the joined room and the refusal page are in French', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const zoe = uniqueName('Zoé ');
    const roomId = await openRoomAsNewGuest(page, alex);
    const zoePage = await newVisitorPage(browser);

    await zoePage.goto(roomPath(roomId));
    await expectEveryVisibleStringFromCatalog(zoePage);
    await enterFromInvitation(zoePage, zoe);
    await expect(zoePage).toHaveURL(roomPath(roomId));
    await expectEveryVisibleStringFromCatalog(zoePage, [alex, zoe]);
    await expect(zoePage.locator('html')).toHaveAttribute('lang', 'fr');

    await setRoomPhase(roomId, 'racing');
    const ninaPage = await newGuestPage(browser, uniqueName('Nina '));
    await ninaPage.goto(roomPath(roomId));
    await expectEveryVisibleStringFromCatalog(ninaPage);
    await zoePage.context().close();
    await ninaPage.context().close();
  });

  test('the refusal page fits a 320px screen', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    await setRoomPhase(roomId, 'racing');
    const ninaPage = await newGuestPage(browser, uniqueName('Nina '));
    await ninaPage.setViewportSize({ width: 320, height: 640 });
    await ninaPage.goto(roomPath(roomId));
    const overflow = await ninaPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await ninaPage.context().close();
  });
});
