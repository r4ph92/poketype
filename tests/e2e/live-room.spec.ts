import { expect, test, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { hashSessionToken } from '../../src/server/sessions/session-token';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { readSessionToken, uniqueName, withTestDatabase } from './support/guests';
import { newGuestPage, openRoomAsNewGuest, playerCountText, setRoomPhase } from './support/rooms';

const liveUpdateMs = 2_000;
const playerRows = (page: Page) => page.getByRole('list').getByRole('listitem');
const roomPath = (roomId: string) => `/rooms/${roomId}`;

type HiddenTabWindow = Window & { setTabHidden: (hidden: boolean) => void };
type MutationWindow = Window & { rosterMutations: number };

function watchNavigations(page: Page): () => number {
  let navigations = 0;
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navigations += 1;
  });
  return () => navigations;
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

async function expireSessionOf(page: Page): Promise<void> {
  const tokenHash = hashSessionToken(await readSessionToken(page.context()));
  await withTestDatabase(async (sql) => {
    await sql`update sessions set expires_at = now() - interval '1 minute' where token_hash = ${tokenHash}`;
  });
}

test.describe('live waiting room', () => {
  test('within 2 seconds of Zoe opening the link, Alex sees her without refreshing', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const zoe = uniqueName('Zoé ');
    const roomId = await openRoomAsNewGuest(page, alex);
    const navigations = watchNavigations(page);
    const zoePage = await newGuestPage(browser, zoe);

    await zoePage.goto(roomPath(roomId));
    await expect(playerRows(page).nth(1)).toContainText(zoe, { timeout: liveUpdateMs });
    await expect(page.getByText(playerCountText(2), { exact: true })).toBeVisible();
    await expect(playerRows(page).filter({ hasText: fr.Room.youMarker })).toContainText(alex);
    expect(navigations()).toBe(0);
    await zoePage.context().close();
  });

  test('after a 5 second network cut while Nina joins, Zoe sees Nina within 2 seconds of the network returning', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    await zoePage.goto(roomPath(roomId));
    const navigations = watchNavigations(zoePage);
    const nina = uniqueName('Nina ');

    await zoePage.context().setOffline(true);
    const ninaPage = await newGuestPage(browser, nina);
    await ninaPage.goto(roomPath(roomId));
    await zoePage.waitForTimeout(5_000);
    await expect(zoePage.getByText(fr.Room.reconnecting)).toBeVisible();
    await expect(playerRows(zoePage)).toHaveCount(2);

    await zoePage.context().setOffline(false);
    await expect(playerRows(zoePage).nth(2)).toContainText(nina, { timeout: liveUpdateMs });
    await expect(zoePage.getByText(fr.Room.reconnecting)).toBeHidden();
    expect(navigations()).toBe(0);
    await zoePage.context().close();
    await ninaPage.context().close();
  });

  test('when the room closes, the player sees that it is no longer available, with a way back', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    await setRoomPhase(roomId, 'closed');
    await expect(page.getByText(fr.Room.gone)).toBeVisible({ timeout: liveUpdateMs });
    await expect(page.getByRole('list')).toHaveCount(0);
    await page.getByRole('link', { name: fr.Room.backToPlay }).click();
    await expect(page).toHaveURL('/play');
  });

  test('when the session ends, the room tab goes to the trainer name step for that room', async ({ page }) => {
    const alex = uniqueName('Alex ');
    const roomId = await openRoomAsNewGuest(page, alex);
    await expireSessionOf(page);
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

  test('an unchanged room is not redrawn while polling', async ({ page }) => {
    await openRoomAsNewGuest(page, uniqueName('Alex '));
    const snapshotRequests = countSnapshotRequests(page);
    await page.evaluate(() => {
      const mutationWindow = window as unknown as MutationWindow;
      mutationWindow.rosterMutations = 0;
      const roster = document.querySelector('[aria-live="polite"]')!;
      new MutationObserver((records) => (mutationWindow.rosterMutations += records.length)).observe(roster, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
      });
    });

    await page.waitForTimeout(3_000);
    expect(snapshotRequests()).toBeGreaterThanOrEqual(2);
    expect(await page.evaluate(() => (window as unknown as MutationWindow).rosterMutations)).toBe(0);
  });
});

test.describe('French live states', () => {
  test('the reconnecting and room gone states are French catalog values', async ({ page }) => {
    const alex = uniqueName('Alex ');
    const roomId = await openRoomAsNewGuest(page, alex);

    await page.context().setOffline(true);
    await expect(page.getByText(fr.Room.reconnecting)).toBeVisible({ timeout: liveUpdateMs });
    await expectEveryVisibleStringFromCatalog(page, [alex]);
    await page.context().setOffline(false);

    await setRoomPhase(roomId, 'closed');
    await expect(page.getByText(fr.Room.gone)).toBeVisible({ timeout: liveUpdateMs });
    await expectEveryVisibleStringFromCatalog(page);
  });
});
