import { expect, test, type Browser, type Page, type Request } from '@playwright/test';
import fr from '../../messages/fr.json';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { uniqueName } from './support/guests';
import { editableElements, firstChangeTo, installRaceHarness, passageFragments, readTimerChanges, readWallClockSkew, timer, typingArea } from './support/race';
import { newGuestPage, playerRows, readParticipants, readRoomCode, readRoomPhase, readRoomRaces, roomPagePath, openRoomAsNewGuest } from './support/rooms';

const startButton = (page: Page) => page.getByRole('button', { name: fr.Room.startRace });
const passage = (page: Page) => page.locator('#passage-heading + p');
const needMorePlayers = fr.Room.needMorePlayers.replace('{count}', '2');
const countdownMs = 8_000;

type RoomOfTwo = { alexPage: Page; zoePage: Page; roomId: string; alex: string; zoe: string };

async function openRoomOfTwo(browser: Browser, page: Page, zoeClockSkewMs = 0): Promise<RoomOfTwo> {
  const alex = uniqueName('Alex ');
  const zoe = uniqueName('Zoé ');
  await installRaceHarness(page.context());
  const roomId = await openRoomAsNewGuest(page, alex);
  const zoePage = await newGuestPage(browser, zoe, (context) => installRaceHarness(context, zoeClockSkewMs));
  await zoePage.goto(roomPagePath(roomId));
  await expect(playerRows(page)).toHaveCount(2);
  return { alexPage: page, zoePage, roomId, alex, zoe };
}

// Next prefetches a page link, like the footer credits, when it scrolls into view; it reads a page and records nothing.
function isRouterPrefetch(request: Request): boolean {
  return request.headers()['next-router-prefetch'] === '1';
}

function recordStartRequests(page: Page): () => number {
  let starts = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/start')) starts += 1;
  });
  return () => starts;
}

test.describe('starting the race', () => {
  test('a lone host sees "Lancer la course" unavailable with "Il faut au moins 2 joueurs", and clicking it sends nothing', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const startRequests = recordStartRequests(page);

    await expect(startButton(page)).toHaveAttribute('aria-disabled', 'true');
    await expect(startButton(page)).toHaveAccessibleDescription(needMorePlayers);
    await expect(page.getByText(needMorePlayers, { exact: true })).toBeVisible();
    await startButton(page).click({ force: true });
    await page.waitForTimeout(1_500);
    expect(startRequests()).toBe(0);
    expect(await readRoomPhase(roomId)).toBe('waiting');
  });

  test('the start button becomes available as soon as Zoe joins', async ({ browser, page }) => {
    const { zoePage } = await openRoomOfTwo(browser, page);

    await expect(startButton(page)).toHaveAttribute('aria-disabled', 'false');
    await expect(page.getByText(needMorePlayers, { exact: true })).toHaveCount(0);
    await zoePage.context().close();
  });

  test('Zoe sees no start button and sees that the host will start', async ({ browser, page }) => {
    const { zoePage, roomId, alex, zoe } = await openRoomOfTwo(browser, page);

    await expect(zoePage.getByText(fr.Room.hostWillStart, { exact: true })).toBeVisible();
    await expect(startButton(zoePage)).toHaveCount(0);
    await expectEveryVisibleStringFromCatalog(zoePage, [alex, zoe, await readRoomCode(roomId)]);
    await expectEveryVisibleStringFromCatalog(page, [alex, zoe, await readRoomCode(roomId)]);
    await zoePage.context().close();
  });

  for (const zoeClockSkewMs of [120_000, -120_000]) {
    test(`with Zoe's clock ${zoeClockSkewMs > 0 ? 'two minutes ahead' : 'two minutes behind'}, both browsers count 3, 2, 1 and reach "Partez !" within 0.5 s of each other`, async ({ browser, page }) => {
      const { zoePage } = await openRoomOfTwo(browser, page, zoeClockSkewMs);
      expect(Math.abs((await readWallClockSkew(zoePage)) - zoeClockSkewMs)).toBeLessThan(10_000);

      await startButton(page).click();
      await expect(timer(page)).toHaveText(fr.Room.go, { timeout: countdownMs });
      await expect(timer(zoePage)).toHaveText(fr.Room.go, { timeout: countdownMs });

      const alexChanges = await readTimerChanges(page);
      const zoeChanges = await readTimerChanges(zoePage);
      for (const changes of [alexChanges, zoeChanges]) expect(changes.map((change) => change.text)).toEqual(expect.arrayContaining(['3', '2', '1', fr.Room.go]));
      expect(zoeChanges.map((change) => change.text).slice(-4)).toEqual(['3', '2', '1', fr.Room.go]);
      const goGap = firstChangeTo(alexChanges, fr.Room.go)!.at - firstChangeTo(zoeChanges, fr.Room.go)!.at;
      expect(Math.abs(goGap)).toBeLessThan(500);
      await zoePage.context().close();
    });
  }

  test('both players see the same passage, character for character, during the countdown', async ({ browser, page }) => {
    const { zoePage, roomId } = await openRoomOfTwo(browser, page);

    await startButton(page).click();
    await expect(timer(zoePage)).toBeVisible();
    await expect(timer(zoePage)).not.toHaveText(fr.Room.go);
    const [race] = await readRoomRaces(roomId);
    const alexPassage = await passage(page).textContent();
    const zoePassage = await passage(zoePage).textContent();
    expect(alexPassage).toBe(race!.passage);
    expect(zoePassage).toBe(race!.passage);
    await expect(passage(zoePage)).toHaveAttribute('lang', 'fr');
    await zoePage.context().close();
  });

  test('during the countdown the typing area is closed and typing records nothing; at "Partez !" it opens and takes focus', async ({ browser, page }) => {
    const { zoePage, roomId } = await openRoomOfTwo(browser, page);
    await startButton(page).click();
    await expect(timer(zoePage)).toBeVisible();
    const [raceBefore] = await readRoomRaces(roomId);
    const requests: string[] = [];
    zoePage.on('request', (request) => {
      if (isRouterPrefetch(request)) return;
      requests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });

    await expect(zoePage.locator('main').locator(editableElements)).toHaveCount(1);
    await expect(typingArea(zoePage)).not.toBeEditable();
    await expect(typingArea(zoePage)).toHaveAttribute('aria-disabled', 'true');
    await zoePage.keyboard.type('bonjour');
    await typingArea(zoePage).focus();
    await zoePage.keyboard.type('Le');
    await expect(passage(zoePage)).toHaveText(raceBefore!.passage);
    expect(requests.every((request) => request === `GET /api/rooms/${roomId}/snapshot`)).toBe(true);

    await expect(timer(zoePage)).toHaveText(fr.Room.go, { timeout: countdownMs });
    await expect(typingArea(zoePage)).toBeEditable();
    await expect(typingArea(zoePage)).toBeFocused();
    expect(requests.every((request) => request === `GET /api/rooms/${roomId}/snapshot`)).toBe(true);
    expect(await readRoomRaces(roomId)).toEqual([raceBefore]);
    expect((await readParticipants(roomId)).every((participant) => participant.keystrokes === 0)).toBe(true);
    await zoePage.context().close();
  });

  test('in French, the waiting, countdown and "Partez !" screens show only catalog values', async ({ browser, page }) => {
    const { zoePage, roomId, alex, zoe } = await openRoomOfTwo(browser, page);
    await expectEveryVisibleStringFromCatalog(page, [alex, zoe, await readRoomCode(roomId)]);

    await startButton(page).click();
    await expect(timer(page)).toHaveText(/^[321]$/, { timeout: countdownMs });
    const [race] = await readRoomRaces(roomId);
    for (const shown of [page, zoePage]) await expectEveryVisibleStringFromCatalog(shown, [alex, zoe, ...passageFragments(race!.passage)]);
    await expect(timer(zoePage)).toHaveText(fr.Room.go, { timeout: countdownMs });
    for (const shown of [page, zoePage]) await expectEveryVisibleStringFromCatalog(shown, [alex, zoe, ...passageFragments(race!.passage)]);
    await zoePage.context().close();
  });

  test('a double click on "Lancer la course" while the server is slow starts one race and shows no error', async ({ browser, page }) => {
    const { zoePage, roomId } = await openRoomOfTwo(browser, page);
    const startRequests = recordStartRequests(page);
    await page.route('**/api/rooms/*/start', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      return route.continue();
    });

    await startButton(page).click();
    await expect(startButton(page)).toHaveAttribute('aria-disabled', 'true');
    await expect(startButton(page)).toHaveAccessibleDescription(fr.Room.starting);
    await startButton(page).click({ force: true });
    await startButton(page).click({ force: true });
    await expect(timer(page)).toBeVisible({ timeout: countdownMs });

    expect(startRequests()).toBe(1);
    expect(await readRoomRaces(roomId)).toHaveLength(1);
    await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
    await expect(page.getByText(fr.Room.startFailed)).toHaveCount(0);
    await zoePage.context().close();
  });
});
