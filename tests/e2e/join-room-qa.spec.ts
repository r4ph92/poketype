import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { submitTrainerName, uniqueName } from './support/guests';
import { en, switchInterfaceTo } from './support/locale';
import { countMembersOf, createRoom, newGuestPage, openRoomAsNewGuest, playerCountText, playerRows, roomPagePath, setRoomPhase } from './support/rooms';
import { chooseStarterOnScreen } from './support/trainer';

const liveUpdateMs = 2_000;

type HiddenTabWindow = Window & { setTabHidden: (hidden: boolean) => void };

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

async function leaveInAnotherTab(roomTab: Page): Promise<Page> {
  const playTab = await roomTab.context().newPage();
  await playTab.goto('/play');
  await playTab.getByRole('button', { name: fr.Play.leave }).click();
  await expect(playTab).toHaveURL('/');
  return playTab;
}

test.describe('network cut without an offline signal', () => {
  test('when requests are silently lost for 5 seconds while Nina joins, Zoe sees Nina within 2 seconds of the network returning', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    await zoePage.goto(roomPagePath(roomId));
    let requestsAreLost = false;
    let onRequestLost = () => {};
    await zoePage.route('**/snapshot', async (route) => {
      if (!requestsAreLost) return route.continue();
      onRequestLost();
    });
    const nina = uniqueName('Nina ');

    requestsAreLost = true;
    const ninaPage = await newGuestPage(browser, nina);
    await ninaPage.goto(roomPagePath(roomId));
    await zoePage.waitForTimeout(5_000);
    await expect(zoePage.getByText(fr.Room.reconnecting)).toBeVisible();
    // The network returns right after one more request was lost, as when a cut ends mid-request.
    await new Promise<void>((resolve) => (onRequestLost = resolve));
    requestsAreLost = false;

    await expect(playerRows(zoePage).filter({ hasText: nina })).toHaveCount(1, { timeout: liveUpdateMs });
    await zoePage.context().close();
    await ninaPage.context().close();
  });
});

test.describe('the session ends in another tab', () => {
  test('after "Changer de dresseur" in another tab, the room tab goes to the trainer name step for that room', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    await zoePage.goto(roomPagePath(roomId));

    await leaveInAnotherTab(zoePage);

    await expect(zoePage).toHaveURL(`/?room=${roomId}`, { timeout: liveUpdateMs });
    await expect(zoePage.getByText(fr.Home.joinRoomHint)).toBeVisible();
    await zoePage.context().close();
  });

  test('a player who switches trainer in another tab is never told that a room still open is gone', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    await zoePage.goto(roomPagePath(roomId));
    await zoePage.route('**/snapshot', (route) => route.abort());

    const playTab = await leaveInAnotherTab(zoePage);
    await submitTrainerName(playTab, uniqueName('Zoé B '));
    await chooseStarterOnScreen(playTab);
    await expect(playTab).toHaveURL('/play');
    await zoePage.unroute('**/snapshot');

    await zoePage.waitForTimeout(liveUpdateMs + 500);
    await expect(zoePage.getByText(fr.Play.roomClosed)).toBeHidden();
    await zoePage.context().close();
  });
});

test.describe('a room that is gone', () => {
  test('when the room closes, the page stops inviting friends to it', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    await setRoomPhase(roomId, 'closed');
    await expect(page).toHaveURL('/play', { timeout: liveUpdateMs });

    await expect(page.getByText(fr.Room.inviteHint)).toBeHidden();
    await expect(page.getByRole('button', { name: fr.Room.copyLink })).toBeHidden();
  });
});

test.describe('the invitation step for a room that cannot be joined', () => {
  test('an unknown, closed or started room does not promise to join the friend\'s room', async ({ browser, page }) => {
    const closedRoomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    await setRoomPhase(closedRoomId, 'closed');
    const racingRoomId = await createRoom(await newGuestPage(browser, uniqueName('Léa ')));
    await setRoomPhase(racingRoomId, 'racing');
    const visitor = await (await browser.newContext()).newPage();

    for (const roomId of [randomUUID(), closedRoomId, racingRoomId]) {
      await visitor.goto(`/?room=${roomId}`);
      await expect(visitor.getByText(fr.Home.joinRoomHint), roomId).toBeHidden();
    }
    expect(await countMembersOf(racingRoomId)).toBe(1);
    await visitor.context().close();
  });
});

test.describe('a room tab reloaded by a language switch in another tab', () => {
  test('a player who joined while the room tab was hidden appears once the tab is visible again', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const hiddenRoomTab = await page.context().newPage();
    await allowHidingTheTab(hiddenRoomTab);
    await hiddenRoomTab.goto(roomPagePath(roomId));
    await setTabHidden(hiddenRoomTab, true);
    const zoe = uniqueName('Zoé ');
    const zoePage = await newGuestPage(browser, zoe);
    await zoePage.goto(roomPagePath(roomId));

    await switchInterfaceTo(page, 'en');
    await expect(hiddenRoomTab.locator('html')).toHaveAttribute('lang', 'en');
    await setTabHidden(hiddenRoomTab, false);

    await expect(playerRows(hiddenRoomTab).filter({ hasText: zoe })).toHaveCount(1, { timeout: liveUpdateMs });
    await expect(hiddenRoomTab.getByText('2 players', { exact: true })).toBeVisible();
    await expect(hiddenRoomTab.getByText(en.Room.youMarker, { exact: true })).toBeVisible();
    await zoePage.context().close();
  });
});

test.describe('a slow connection', () => {
  test('when every snapshot answer takes 1.2 seconds, Zoe still sees Nina join', async ({ browser, page }) => {
    const answerDelayMs = 1_200;
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    await zoePage.goto(roomPagePath(roomId));
    await zoePage.route('**/snapshot', async (route) => {
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, answerDelayMs));
      await route.fulfill({ response }).catch(() => {});
    });
    const nina = uniqueName('Nina ');

    const ninaPage = await newGuestPage(browser, nina);
    await ninaPage.goto(roomPagePath(roomId));

    await expect(playerRows(zoePage).filter({ hasText: nina })).toHaveCount(1, { timeout: answerDelayMs + 2 * liveUpdateMs });
    await expect(zoePage.getByText(playerCountText(3))).toBeVisible();
    await zoePage.context().close();
    await ninaPage.context().close();
  });
});

test.describe('switching the language on the invitation step', () => {
  test('a guestless Zoe who switches to English before choosing her name still lands in the friend\'s room', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const zoePage = await (await browser.newContext()).newPage();
    await zoePage.goto(roomPagePath(roomId));
    await expect(zoePage).toHaveURL(`/?room=${roomId}`);

    await switchInterfaceTo(zoePage, 'en');
    await expect(zoePage.getByText(en.Home.joinRoomHint)).toBeVisible();
    await zoePage.getByLabel(en.GuestEntry.label).fill(uniqueName('Zoé '));
    await zoePage.getByRole('button', { name: en.GuestEntry.submit }).click();
    await chooseStarterOnScreen(zoePage);

    await expect(zoePage).toHaveURL(roomPagePath(roomId));
    expect(await countMembersOf(roomId)).toBe(2);
    await zoePage.context().close();
  });
});

test.describe('switching the language on the invitation step without JavaScript', () => {
  test('the friend\'s room survives a language switch rendered on the server only', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const zoePage = await (await browser.newContext({ javaScriptEnabled: false })).newPage();
    await zoePage.goto(roomPagePath(roomId));

    await switchInterfaceTo(zoePage, 'en');
    await expect(zoePage).toHaveURL(`/?room=${roomId}`);
    await zoePage.getByLabel(en.GuestEntry.label).fill(uniqueName('Zoé '));
    await zoePage.getByRole('button', { name: en.GuestEntry.submit }).click();
    await chooseStarterOnScreen(zoePage);

    await expect(zoePage).toHaveURL(roomPagePath(roomId));
    expect(await countMembersOf(roomId)).toBe(2);
    await zoePage.context().close();
  });
});
