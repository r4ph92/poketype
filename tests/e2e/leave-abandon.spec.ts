import { expect, test } from '@playwright/test';
import fr from '../../messages/fr.json';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { uniqueName } from './support/guests';
import { passageFragments, typingArea } from './support/race';
import { readResultCells, resultsTable } from './support/results';
import { finishRaceInDatabase } from './support/settlement';
import { newGuestPage, openRoomAsNewGuest, playerRows, roomPagePath, testPassage } from './support/rooms';
import { racerRow, startTwoPlayerRace } from './support/typing';

const liveUpdateMs = 2_000;

test.describe('leaving the room', () => {
  test('Zoe leaves the waiting room, Alex sees her go within 2 seconds, and she can rejoin while it still waits', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const zoe = uniqueName('Zoé ');
    const roomId = await openRoomAsNewGuest(page, alex);
    const zoePage = await newGuestPage(browser, zoe);
    await zoePage.goto(roomPagePath(roomId));
    await expect(playerRows(page)).toHaveCount(2);

    await zoePage.getByRole('button', { name: fr.Room.leaveRoom }).click();
    await expect(zoePage).toHaveURL('/play');
    await expect(playerRows(page)).toHaveCount(1, { timeout: liveUpdateMs });

    await zoePage.goto(roomPagePath(roomId));
    await expect(playerRows(zoePage)).toHaveCount(2);
    await zoePage.context().close();
  });

  test('the host warns before leaving, and when he confirms everyone else lands on the play page with the closed-room notice', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    await zoePage.goto(roomPagePath(roomId));
    await expect(playerRows(page)).toHaveCount(2);

    await page.getByRole('button', { name: fr.Room.leaveRoom }).click();
    const dialog = page.getByRole('dialog', { name: fr.Room.leaveTitle });
    await expect(dialog.getByText(fr.Room.leaveHostMessage)).toBeVisible();
    await dialog.getByRole('button', { name: fr.Room.cancelAction }).click();
    await expect(dialog).toBeHidden();
    await expect(playerRows(page)).toHaveCount(2);

    await page.getByRole('button', { name: fr.Room.leaveRoom }).click();
    await dialog.getByRole('button', { name: fr.Room.confirmLeave }).click();
    await expect(page).toHaveURL('/play');
    await expect(page.getByText(fr.Play.roomClosed)).toBeHidden();
    await expect(zoePage).toHaveURL('/play', { timeout: liveUpdateMs });
    await expect(zoePage.getByText(fr.Play.roomClosed)).toBeVisible();
    await zoePage.context().close();
  });

  test('Zoe leaving mid-race confirms first, goes to the play page, and the results list her as abandoned', async ({ browser, page }) => {
    const race = await startTwoPlayerRace(browser, page);

    await race.zoePage.getByRole('button', { name: fr.Room.leaveRoom }).click();
    const dialog = race.zoePage.getByRole('dialog', { name: fr.Room.leaveTitle });
    await expect(dialog.getByText(fr.Room.leaveRaceMessage)).toBeVisible();
    await dialog.getByRole('button', { name: fr.Room.confirmLeave }).click();
    await expect(race.zoePage).toHaveURL('/play');

    await expect(racerRow(race.alexPage, race.zoe).getByText(fr.Room.abandoned)).toBeVisible({ timeout: liveUpdateMs });
    await finishRaceInDatabase(race.roomId, [{ trainerName: race.alex, elapsedMs: 20_000, rejectedKeystrokes: 0 }]);
    await expect(resultsTable(race.alexPage)).toBeVisible({ timeout: liveUpdateMs });
    await race.zoePage.context().close();
  });
});

test.describe('abandoning the race', () => {
  test('Zoe abandons and keeps watching: typing stops, Alex sees Abandon, and the results list her last without a place', async ({ browser, page }) => {
    const race = await startTwoPlayerRace(browser, page);
    await expectEveryVisibleStringFromCatalog(race.zoePage, [race.alex, race.zoe, ...passageFragments(testPassage)]);

    await race.zoePage.getByRole('button', { name: fr.Room.abandonRace }).click();
    const dialog = race.zoePage.getByRole('dialog', { name: fr.Room.abandonTitle });
    await expectEveryVisibleStringFromCatalog(race.zoePage, [race.alex, race.zoe, ...passageFragments(testPassage)]);
    await dialog.getByRole('button', { name: fr.Room.confirmAbandon }).click();

    await expect(race.zoePage.getByText(fr.Room.abandonedBanner)).toBeVisible();
    await expect(typingArea(race.zoePage)).not.toBeEditable();
    await expect(racerRow(race.alexPage, race.zoe).getByText(fr.Room.abandoned)).toBeVisible({ timeout: liveUpdateMs });
    await expect(race.alexPage.getByRole('button', { name: fr.Room.abandonRace })).toBeVisible();

    await typingArea(race.alexPage).pressSequentially(testPassage.slice(0, 5));
    await expect(racerRow(race.zoePage, race.alex)).not.toContainText(fr.Room.abandoned);

    await finishRaceInDatabase(race.roomId, [{ trainerName: race.alex, elapsedMs: 20_000, rejectedKeystrokes: 0 }]);
    for (const shown of [race.alexPage, race.zoePage]) await expect(resultsTable(shown)).toBeVisible({ timeout: liveUpdateMs });
    const cells = await readResultCells(race.alexPage);
    expect(cells.map((row) => row[1])).toEqual([race.alex, race.zoe]);
    expect(cells[1]![0]).toBe('—');
    expect(cells[1]![1]).toBe(race.zoe);
    expect(cells[1]![2]).toBe(fr.Room.abandoned);
    await expect(race.zoePage.getByRole('button', { name: fr.Room.leaveRoom })).toBeVisible();
    await race.zoePage.context().close();
  });
});
