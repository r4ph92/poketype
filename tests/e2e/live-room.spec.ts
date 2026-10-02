import { expect, test, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { expireSession, readSessionToken, uniqueName } from './support/guests';
import { newGuestPage, openRoomAsNewGuest, playerCountText, playerRows, readRoomCode, roomPagePath, setRoomPhase } from './support/rooms';

const liveUpdateMs = 2_000;

type HiddenTabWindow = Window & { setTabHidden: (hidden: boolean) => void };
type MutationWindow = Window & { rosterMutations: number };
type MarkedWindow = Window & { isSameDocument?: boolean };

// Counting framenavigated would also count Next's same-document history update after hydration, so a window marker proves no reload happened.
async function markDocument(page: Page): Promise<() => Promise<void>> {
  const url = page.url();
  await page.evaluate(() => ((window as unknown as MarkedWindow).isSameDocument = true));
  return async () => {
    expect(page.url()).toBe(url);
    expect(await page.evaluate(() => (window as unknown as MarkedWindow).isSameDocument)).toBe(true);
  };
}

function countSnapshotRequests(page: Page): () => number {
  let requests = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/snapshot')) requests += 1;
  });
  return () => requests;
}

async function allowHidingTheTab(page: Page): Promise<void> {
  await page.addInitScript(() => {
    let hidden = false;
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    (window as unknown as HiddenTabWindow).setTabHidden = (next: boolean) => {
      hidden = next;
      document.dispatchEvent(new Event('visibilitychange'));
    };
  });
}

async function setTabHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((next) => (window as unknown as HiddenTabWindow).setTabHidden(next), hidden);
}

async function observeRosterMutations(page: Page): Promise<void> {
  await page.evaluate(() => {
    const mutationWindow = window as unknown as MutationWindow;
    mutationWindow.rosterMutations = 0;
    const roster = document.querySelector('ul')!.closest('[aria-live="polite"]')!;
    new MutationObserver((records) => (mutationWindow.rosterMutations += records.length)).observe(roster, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
  });
}

async function readRosterMutations(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as MutationWindow).rosterMutations);
}

async function resetRosterMutations(page: Page): Promise<void> {
  await page.evaluate(() => ((window as unknown as MutationWindow).rosterMutations = 0));
}

test.describe('live waiting room', () => {
  test('within 2 seconds of Zoe opening the link, Alex sees her without refreshing', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const zoe = uniqueName('Zoé ');
    const roomId = await openRoomAsNewGuest(page, alex);
    const expectNoNavigation = await markDocument(page);
    const zoePage = await newGuestPage(browser, zoe);

    const openedAt = Date.now();
    await zoePage.goto(roomPagePath(roomId));
    await expect(playerRows(page).nth(1)).toContainText(zoe, { timeout: liveUpdateMs });
    expect(Date.now() - openedAt).toBeLessThan(liveUpdateMs);
    await expect(page.getByText(playerCountText(2), { exact: true })).toBeVisible();
    await expect(playerRows(page).filter({ hasText: fr.Room.youMarker })).toContainText(alex);
    await expectNoNavigation();
    await zoePage.context().close();
  });

  test('after a 5 second network cut while Nina joins, Zoe sees Nina within 2 seconds of the network returning', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    await zoePage.goto(roomPagePath(roomId));
    const expectNoNavigation = await markDocument(zoePage);
    const nina = uniqueName('Nina ');

    await zoePage.context().setOffline(true);
    const ninaPage = await newGuestPage(browser, nina);
    await ninaPage.goto(roomPagePath(roomId));
    await zoePage.waitForTimeout(5_000);
    await expect(zoePage.getByText(fr.Room.reconnecting)).toBeVisible();
    await expect(playerRows(zoePage)).toHaveCount(2);

    await zoePage.context().setOffline(false);
    await expect(playerRows(zoePage).nth(2)).toContainText(nina, { timeout: liveUpdateMs });
    await expect(zoePage.getByText(fr.Room.reconnecting)).toBeHidden();
    await expectNoNavigation();
    await zoePage.context().close();
    await ninaPage.context().close();
  });

  test('when the room closes, the player lands on the play page with the closed-room notice, once', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    await setRoomPhase(roomId, 'closed');
    await expect(page).toHaveURL('/play', { timeout: liveUpdateMs });
    await expect(page.getByText(fr.Play.roomClosed)).toBeVisible();
    await page.reload();
    await expect(page.getByText(fr.Play.roomClosed)).toBeHidden();
  });

  test('when the session ends, the room tab goes to the trainer name step for that room', async ({ page }) => {
    const alex = uniqueName('Alex ');
    const roomId = await openRoomAsNewGuest(page, alex);
    await expireSession(await readSessionToken(page.context()));
    await expect(page).toHaveURL(`/?room=${roomId}`, { timeout: liveUpdateMs });
    await expect(page.getByText(fr.Home.joinRoomHint)).toBeVisible();
    await expect(page.locator('body')).not.toContainText(alex);
  });
});

test.describe('polling cost', () => {
  test('a hidden tab stops asking, and asks again as soon as it is visible', async ({ page }) => {
    await allowHidingTheTab(page);
    await openRoomAsNewGuest(page, uniqueName('Alex '));
    const snapshotRequests = countSnapshotRequests(page);

    await setTabHidden(page, true);
    const requestsWhenHidden = snapshotRequests();
    await page.waitForTimeout(3_000);
    expect(snapshotRequests()).toBe(requestsWhenHidden);

    const nextRequest = page.waitForRequest((request) => request.url().endsWith('/snapshot'), { timeout: 300 });
    await setTabHidden(page, false);
    await nextRequest;
  });

  test('an unchanged room is not redrawn while polling, and the observer does see a real change', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    await observeRosterMutations(page);

    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    await zoePage.goto(roomPagePath(roomId));
    await expect(playerRows(page)).toHaveCount(2, { timeout: liveUpdateMs });
    expect(await readRosterMutations(page)).toBeGreaterThan(0);

    await resetRosterMutations(page);
    const snapshotRequests = countSnapshotRequests(page);
    await page.waitForTimeout(3_000);
    expect(snapshotRequests()).toBeGreaterThanOrEqual(2);
    expect(await readRosterMutations(page)).toBe(0);
    await zoePage.context().close();
  });
});

test.describe('French live states', () => {
  test('the reconnecting and room closed states are French catalog values', async ({ page }) => {
    const alex = uniqueName('Alex ');
    const roomId = await openRoomAsNewGuest(page, alex);

    await page.context().setOffline(true);
    await expect(page.getByText(fr.Room.reconnecting)).toBeVisible({ timeout: liveUpdateMs });
    await expectEveryVisibleStringFromCatalog(page, [alex, await readRoomCode(roomId)]);
    await page.context().setOffline(false);

    await setRoomPhase(roomId, 'closed');
    await expect(page.getByText(fr.Play.roomClosed)).toBeVisible({ timeout: liveUpdateMs });
    await expectEveryVisibleStringFromCatalog(page);
  });
});
