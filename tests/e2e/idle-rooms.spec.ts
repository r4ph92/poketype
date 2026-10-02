import { expect, test, type Browser, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { gameConfig } from '../../src/config/game';
import { expectNoAccessibilityViolations } from './support/axe';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { parseCssColor, sameColor, themeColors, type ColorScheme } from './support/contrast';
import { enterAsGuest, uniqueName } from './support/guests';
import { newGuestPage, openRoomAsNewGuest, playerRows, readIdleState, readRoomCode, roomPagePath, setLobbyInactiveFor } from './support/rooms';

const { idleAfterMs, closeAfterMs } = gameConfig.rooms;
const liveUpdateMs = 3_000;

const toast = (page: Page, message: string) => page.getByRole('status').filter({ hasText: message });
const idleToast = (page: Page) => toast(page, fr.Room.idleMessage);
const closedToast = (page: Page) => toast(page, fr.Play.roomClosedIdle);

type LobbyOfTwo = { roomId: string; alex: string; zoe: string; zoePage: Page };

async function lobbyOfTwo(browser: Browser, page: Page): Promise<LobbyOfTwo> {
  const alex = uniqueName('Alex ');
  const zoe = uniqueName('Zoé ');
  const roomId = await openRoomAsNewGuest(page, alex);
  const zoePage = await newGuestPage(browser, zoe);
  await zoePage.goto(roomPagePath(roomId));
  await expect(playerRows(page)).toHaveCount(2);
  return { roomId, alex, zoe, zoePage };
}

test.describe('an idle lobby', () => {
  test('after 5 minutes without a join or leave, both players see the inactive-room toast; Zoe dismisses it and Alex starts a new room from it', async ({ browser, page }) => {
    const { roomId, alex, zoe, zoePage } = await lobbyOfTwo(browser, page);
    await expect(page.getByText(fr.Room.idleMessage)).toBeHidden();

    await setLobbyInactiveFor(roomId, idleAfterMs + 1_000);

    await expect(idleToast(page)).toContainText(fr.Room.idleMessage, { timeout: liveUpdateMs });
    await expect(idleToast(zoePage)).toContainText(fr.Room.idleMessage, { timeout: liveUpdateMs });
    await expectEveryVisibleStringFromCatalog(page, [alex, zoe, await readRoomCode(roomId)]);
    await expectNoAccessibilityViolations(page);

    await idleToast(zoePage).getByRole('button', { name: fr.Play.dismissMessage }).click();
    await expect(zoePage.getByText(fr.Room.idleMessage)).toBeHidden();

    await idleToast(page).getByRole('button', { name: fr.Play.createRoom }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/rooms/') && url.pathname !== roomPagePath(roomId));
    await expect(playerRows(page)).toHaveCount(1);
    await zoePage.context().close();
  });

  test('Nina opening the link of an idle room revives it: the toast goes away for Alex', async ({ browser, page }) => {
    const { roomId, zoePage } = await lobbyOfTwo(browser, page);
    await setLobbyInactiveFor(roomId, idleAfterMs + 1_000);
    await expect(idleToast(page)).toContainText(fr.Room.idleMessage, { timeout: liveUpdateMs });

    const ninaPage = await newGuestPage(browser, uniqueName('Nina '));
    await ninaPage.goto(roomPagePath(roomId));

    await expect(playerRows(page)).toHaveCount(3, { timeout: liveUpdateMs });
    await expect(page.getByText(fr.Room.idleMessage)).toBeHidden();
    await zoePage.context().close();
    await ninaPage.context().close();
  });

  test('at 10 minutes the room closes and every member lands on the play page with "Salle fermée pour inactivité", not the host notice', async ({ browser, page }) => {
    const { roomId, zoePage } = await lobbyOfTwo(browser, page);

    await setLobbyInactiveFor(roomId, closeAfterMs - 1_500);

    for (const member of [page, zoePage]) {
      await expect(member).toHaveURL('/play', { timeout: liveUpdateMs + 1_500 });
      await expect(closedToast(member)).toContainText(fr.Play.roomClosedIdle);
      await expect(member.getByText(fr.Play.roomClosed)).toBeHidden();
    }
    expect(await readIdleState(roomId)).toMatchObject({ phase: 'closed', closeReason: 'idle' });

    await closedToast(zoePage).getByRole('button', { name: fr.Play.dismissMessage }).click();
    await expect(closedToast(zoePage)).toHaveCount(0);
    await zoePage.reload();
    await expect(zoePage.getByText(fr.Play.roomClosedIdle)).toBeHidden();
    await zoePage.context().close();
  });
});

for (const scheme of ['light', 'dark'] as const satisfies readonly ColorScheme[]) {
  test(`the closed-for-inactivity toast uses the ${scheme} theme tokens and passes the accessibility checks`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();
    await enterAsGuest(page, uniqueName('Zoé '));
    const palette = themeColors(scheme);

    await page.goto('/play?closed=idle');
    const card = closedToast(page).locator('> div');

    await expect(card).toContainText(fr.Play.roomClosedIdle);
    const colors = await card.evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, accent: style.borderTopColor, border: style.borderBottomColor, text: style.color };
    });
    expect(sameColor(parseCssColor(colors.background), palette.get('cream')!)).toBe(true);
    expect(sameColor(parseCssColor(colors.accent), palette.get('gold')!)).toBe(true);
    expect(sameColor(parseCssColor(colors.border), palette.get('frame')!)).toBe(true);
    expect(sameColor(parseCssColor(colors.text), palette.get('ink')!)).toBe(true);
    await expectNoAccessibilityViolations(page);
    await context.close();
  });
}
