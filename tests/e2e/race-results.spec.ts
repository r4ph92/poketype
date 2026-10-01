import { expect, test, type Browser, type Page } from '@playwright/test';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { uniqueName } from './support/guests';
import { switchInterfaceTo } from './support/locale';
import { readResultsShownAt, readTrueEpochNow, typingArea } from './support/race';
import { expectedResultCells, readResultCells, resultsTable } from './support/results';
import { newGuestPage, openRoomAsNewGuest, progressPath, roomPagePath, snapshotPath, startRaceInDatabase, testPassage } from './support/rooms';
import { finishRaceInDatabase, readSettledRace } from './support/settlement';
import { startTwoPlayerRace } from './support/typing';

type SettledRoom = { alexPage: Page; zoePage: Page; roomId: string; alex: string; zoe: string };

const typingDelayMs = 60;
const resultsWithinMs = 2_000;

// Two real members whose race is finished straight in the database and settled by the real settlement.
async function settledRoom(browser: Browser, page: Page): Promise<SettledRoom> {
  const alex = uniqueName('Alex ');
  const zoe = uniqueName('Zoé ');
  const roomId = await openRoomAsNewGuest(page, alex);
  const zoePage = await newGuestPage(browser, zoe);
  await zoePage.goto(roomPagePath(roomId));
  await startRaceInDatabase(roomId, -60_000);
  await finishRaceInDatabase(roomId, [
    { trainerName: alex, elapsedMs: 30_000, rejectedKeystrokes: 0 },
    { trainerName: zoe, elapsedMs: 41_250, rejectedKeystrokes: 2 },
  ]);
  return { alexPage: page, zoePage, roomId, alex, zoe };
}

test.describe('the race results', () => {
  test('when the last racer finishes, both pages show the same server results within 2 seconds, and a refresh shows exactly the same', async ({ browser, page }) => {
    const { alexPage, zoePage, roomId } = await startTwoPlayerRace(browser, page);

    await Promise.all([zoePage.keyboard.type(testPassage, { delay: typingDelayMs }), alexPage.keyboard.type(testPassage.slice(0, -1), { delay: typingDelayMs })]);
    await expect(typingArea(zoePage)).not.toBeEditable();
    await expect(resultsTable(alexPage)).toHaveCount(0);
    const lastKeystrokeAt = await readTrueEpochNow(alexPage);
    await alexPage.keyboard.type(testPassage.slice(-1));

    for (const shown of [alexPage, zoePage]) {
      await expect(resultsTable(shown)).toBeVisible({ timeout: resultsWithinMs });
      expect((await readResultsShownAt(shown))! - lastKeystrokeAt).toBeLessThan(resultsWithinMs);
    }
    const expected = expectedResultCells((await readSettledRace(roomId)).results, 'fr');
    expect(expected).toHaveLength(2);
    expect(await readResultCells(alexPage)).toEqual(expected);
    expect(await readResultCells(zoePage)).toEqual(expected);

    const settled = await readSettledRace(roomId);
    await Promise.all([alexPage.reload(), zoePage.reload()]);
    for (const shown of [alexPage, zoePage]) {
      await expect(resultsTable(shown)).toBeVisible();
      expect(await readResultCells(shown)).toEqual(expected);
    }
    const origin = new URL(zoePage.url()).origin;
    const late = await zoePage.request.post(progressPath(roomId), {
      headers: { origin, 'content-type': 'application/json' },
      data: JSON.stringify({ sequence: 999, position: 1, keystrokes: 1, rejectedKeystrokes: 0 }),
    });
    expect(late.status()).toBe(409);
    expect(await readSettledRace(roomId)).toEqual(settled);
    await zoePage.context().close();
  });

  test('in French, the results are announced, every string comes from the catalog, numbers use French formatting, and the page fits 375 px', async ({ browser, page }) => {
    const { alexPage, zoePage, roomId, alex, zoe } = await settledRoom(browser, page);
    await alexPage.setViewportSize({ width: 375, height: 740 });

    await alexPage.reload();
    await expect(alexPage.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(alexPage).toHaveTitle(fr.Metadata.resultsTitle);
    await expect(alexPage.getByRole('heading', { level: 1 })).toHaveText(fr.Room.resultsHeading);
    await expect(alexPage.getByRole('heading', { level: 1 })).toBeFocused();
    const expected = expectedResultCells((await readSettledRace(roomId)).results, 'fr');
    expect(await readResultCells(alexPage)).toEqual(expected);
    expect(expected.flat()).toEqual(expect.arrayContaining([fr.Room.finishTime.replace('{seconds}', '41,3'), fr.Room.progressPercent.replace('{percent}', '97')]));
    await expect(resultsTable(alexPage).getByRole('row').filter({ hasText: fr.Room.youMarker })).toContainText(alex);
    await expectEveryVisibleStringFromCatalog(alexPage, [alex, zoe, ...expected.flat()]);
    expect(await alexPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await zoePage.context().close();
  });

  test('in English, the same results use English wording and number formatting', async ({ browser, page }) => {
    const { alexPage, zoePage, roomId, alex, zoe } = await settledRoom(browser, page);

    await alexPage.reload();
    await switchInterfaceTo(alexPage, 'en');
    await expect(alexPage.getByRole('heading', { level: 1 })).toHaveText(en.Room.resultsHeading);
    await expect(alexPage.getByRole('table', { name: en.Room.resultsCaption })).toBeVisible();
    const expected = expectedResultCells((await readSettledRace(roomId)).results, 'en');
    expect(await readResultCells(alexPage)).toEqual(expected);
    expect(expected.flat()).toEqual(expect.arrayContaining([en.Room.finishTime.replace('{seconds}', '41.3'), en.Room.progressPercent.replace('{percent}', '97')]));
    await expectEveryVisibleStringFromCatalog(alexPage, [alex, zoe, ...expected.flat()], 'en');
    await zoePage.context().close();
  });

  test('Nina, who was not in the room, is refused at the results address and sees no trainer name or score', async ({ browser, page }) => {
    const { zoePage, roomId, alex, zoe } = await settledRoom(browser, page);
    const ninaPage = await newGuestPage(browser, uniqueName('Nina '));
    const guestlessPage = await (await browser.newContext()).newPage();

    for (const visitor of [ninaPage, guestlessPage]) {
      await visitor.goto(roomPagePath(roomId));
      await expect(visitor.getByRole('heading', { level: 1 })).toHaveText(fr.Room.raceStartedHeading);
      await expect(visitor.getByRole('table')).toHaveCount(0);
      for (const name of [alex, zoe]) await expect(visitor.locator('body')).not.toContainText(name);
    }
    const snapshot = await ninaPage.request.get(snapshotPath(roomId));
    expect(snapshot.status()).toBe(403);
    expect(await snapshot.body()).toHaveLength(0);
    await Promise.all([ninaPage.context().close(), guestlessPage.context().close(), zoePage.context().close()]);
  });
});
