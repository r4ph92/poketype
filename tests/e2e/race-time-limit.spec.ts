import { expect, test, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { uniqueName } from './support/guests';
import { installRaceHarness, passageFragments, readRemainingChanges, readWallClockSkew, timeRemaining, typingArea, type TimerChange } from './support/race';
import { expectedResultCells, readResultCells, resultsTable } from './support/results';
import { newGuestPage, openRoomAsNewGuest, playerRows, readRoomPhase, readRoomRaces, roomPagePath, startRaceInDatabase, testPassage } from './support/rooms';
import { readSettledRace } from './support/settlement';
import { startTwoPlayerRace } from './support/typing';

const zoeClockSkewMs = 120_000;
const typingDelayMs = 60;
const resultsAfterDeadlineMs = 3_000;

function remainingText(time: string): string {
  return fr.Room.timeRemaining.replace('{time}', time);
}

async function expectResultsAfterDeadline(pages: Page[], timeLimitMs: number): Promise<void> {
  for (const shown of pages) await expect(resultsTable(shown)).toBeVisible({ timeout: timeLimitMs + resultsAfterDeadlineMs });
}

// Every second both pages showed, paired by text: the server clock makes them change together whatever the computer's clock says.
function largestGapMs(first: TimerChange[], second: TimerChange[]): number {
  const gaps = first.flatMap((change) => {
    const twin = second.find((other) => other.text === change.text);
    return twin ? [Math.abs(twin.at - change.at)] : [];
  });
  expect(gaps.length).toBeGreaterThanOrEqual(5);
  return Math.max(...gaps);
}

test.describe('the race time limit', () => {
  test('both players see the same remaining time, within 1 second, with one computer 2 minutes off, in French; at 0:00 typing stops and the race ends for both', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const zoe = uniqueName('Zoé ');
    const timeLimitMs = 8_000;
    await installRaceHarness(page.context());
    const roomId = await openRoomAsNewGuest(page, alex);
    const zoePage = await newGuestPage(browser, zoe, (context) => installRaceHarness(context, zoeClockSkewMs));
    await zoePage.goto(roomPagePath(roomId));
    await expect(playerRows(page)).toHaveCount(2);
    expect(Math.abs((await readWallClockSkew(zoePage)) - zoeClockSkewMs)).toBeLessThan(1_000);

    await startRaceInDatabase(roomId, 2_500, { timeLimitMs });
    for (const shown of [page, zoePage]) await expect(timeRemaining(shown)).toHaveText(remainingText('0:07'), { timeout: 8_000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expectEveryVisibleStringFromCatalog(page, [alex, zoe, ...passageFragments(testPassage)]);

    await page.route('**/snapshot', (route) => route.abort());
    await expect(timeRemaining(page)).toHaveText(remainingText('0:00'), { timeout: timeLimitMs });
    await expect(typingArea(page)).not.toBeEditable();
    await expect(page.getByText(fr.Room.typingTimeUp, { exact: true })).toBeVisible();
    await expectResultsAfterDeadline([zoePage], 0);
    await page.unroute('**/snapshot');
    await expectResultsAfterDeadline([page], 0);
    expect(largestGapMs(await readRemainingChanges(page), await readRemainingChanges(zoePage))).toBeLessThan(1_000);
    expect((await readSettledRace(roomId)).results.map((result) => result.finishMs)).toEqual([null, null]);
    await zoePage.context().close();
  });

  test('Zoe finished and Alex has not: at the limit both see the results, Alex "Non terminé" with what he typed, ranked by score, in French', async ({ browser, page }) => {
    const timeLimitMs = 12_000;
    const { alexPage, zoePage, roomId, alex, zoe } = await startTwoPlayerRace(browser, page, { timeLimitMs });

    await Promise.all([zoePage.keyboard.type(testPassage, { delay: typingDelayMs }), alexPage.keyboard.type(testPassage.slice(0, 10), { delay: typingDelayMs })]);
    await expect(typingArea(zoePage)).not.toBeEditable();
    await expect(resultsTable(alexPage)).toHaveCount(0);
    await expectResultsAfterDeadline([alexPage, zoePage], timeLimitMs);

    const [race] = await readRoomRaces(roomId);
    const settled = await readSettledRace(roomId);
    expect(settled.endedAt).toEqual(race!.deadlineAt);
    const expected = expectedResultCells(settled.results, 'fr');
    expect(expected).toEqual([expect.arrayContaining([zoe]), expect.arrayContaining([alex, fr.Room.unfinished])]);
    expect(await readResultCells(alexPage)).toEqual(expected);
    expect(await readResultCells(zoePage)).toEqual(expected);
    await expect(alexPage.getByRole('region', { name: fr.Room.raceRecap })).toContainText(fr.Room.unfinished);
    await expect(alexPage.getByText(fr.Room.unfinishedMessage, { exact: true })).toBeVisible();
    await expectEveryVisibleStringFromCatalog(alexPage, [alex, zoe, ...expected.flat()]);
    await zoePage.context().close();
  });

  test('both players closed their tabs during the race: Alex reopens the room after the limit and sees the results of a race ended at the limit', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const timeLimitMs = 4_000;
    const roomId = await openRoomAsNewGuest(page, alex);
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    await zoePage.goto(roomPagePath(roomId));
    await expect(playerRows(page)).toHaveCount(2);
    await startRaceInDatabase(roomId, -1_000, { timeLimitMs });
    const alexContext = page.context();

    await Promise.all([page.close(), zoePage.close()]);
    await new Promise((resolve) => setTimeout(resolve, timeLimitMs));
    expect(await readRoomPhase(roomId)).toBe('countdown');

    const reopened = await alexContext.newPage();
    await reopened.goto(roomPagePath(roomId));
    await expect(resultsTable(reopened)).toBeVisible();
    const [race] = await readRoomRaces(roomId);
    expect((await readSettledRace(roomId)).endedAt).toEqual(race!.deadlineAt);
    await expect(reopened).toHaveTitle(fr.Metadata.resultsTitle);
    await zoePage.context().close();
  });
});
