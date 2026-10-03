import { expect, test, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { uniqueName } from './support/guests';
import { installRaceHarness, timer, typingArea } from './support/race';
import { resultsTable } from './support/results';
import { newGuestPage, openRoomAsNewGuest, playerRows, roomPagePath, startRaceInDatabase, testPassage } from './support/rooms';
import { racerRow } from './support/typing';

const liveUpdateMs = 2_000;
const raceOpensWithinMs = 8_000;
// Long enough ago that a racer who never typed is past the minute without progress.
const startedLongAgoMs = -90_000;

const removeFromRoom = (page: Page, name: string) => page.getByRole('button', { name: fr.Lobby.removePlayerLabel.replace('{name}', name) });
const removeFromRace = (page: Page, name: string) => page.getByRole('button', { name: fr.Room.removeInactiveLabel.replace('{name}', name) });

async function lobbyWithZoe(page: Page, browser: Parameters<typeof newGuestPage>[0]) {
  const alex = uniqueName('Alex ');
  const zoe = uniqueName('Zoé ');
  await installRaceHarness(page.context());
  const roomId = await openRoomAsNewGuest(page, alex);
  const zoePage = await newGuestPage(browser, zoe, installRaceHarness);
  await zoePage.goto(roomPagePath(roomId));
  await expect(playerRows(page)).toHaveCount(2);
  return { roomId, zoePage, alex, zoe };
}

test.describe('the host removes a player', () => {
  test('in the waiting room: Zoe lands on the play page with the reason, Alex sees her go, and she can come back by the link', async ({ browser, page }) => {
    const { roomId, zoePage, alex, zoe } = await lobbyWithZoe(page, browser);
    await expect(removeFromRoom(zoePage, alex)).toHaveCount(0);

    await removeFromRoom(page, zoe).click();
    await expect(zoePage).toHaveURL('/play', { timeout: liveUpdateMs });
    await expect(zoePage.getByText(fr.Play.removedByHost)).toBeVisible();
    await expect(playerRows(page)).toHaveCount(1, { timeout: liveUpdateMs });

    await zoePage.goto(roomPagePath(roomId));
    await expect(playerRows(zoePage)).toHaveCount(2);
    await expect(playerRows(page)).toHaveCount(2, { timeout: liveUpdateMs });
    await zoePage.context().close();
  });

  test('in a race: only after a minute without typing, Zoe becomes inactive, watches the end and is listed without a place', async ({ browser, page }) => {
    const { roomId, zoePage, zoe } = await lobbyWithZoe(page, browser);
    await startRaceInDatabase(roomId, startedLongAgoMs);
    for (const shown of [page, zoePage]) await expect(timer(shown)).toBeVisible({ timeout: raceOpensWithinMs });
    await expect(typingArea(page)).toBeEditable();

    await removeFromRace(page, zoe).click();
    await expect(racerRow(page, zoe).getByText(fr.Room.inactive)).toBeVisible({ timeout: liveUpdateMs });
    await expect(racerRow(zoePage, zoe).getByText(fr.Room.inactive)).toBeVisible({ timeout: liveUpdateMs });
    await expect(zoePage.getByText(fr.Room.inactiveBanner)).toBeVisible();
    await expect(typingArea(zoePage)).not.toBeEditable();
    await expect(removeFromRace(page, zoe)).toHaveCount(0);

    await typingArea(page).focus();
    await page.keyboard.type(testPassage);
    for (const shown of [page, zoePage]) await expect(resultsTable(shown).getByRole('row').filter({ hasText: zoe }).getByText(fr.Room.inactive)).toBeVisible({ timeout: liveUpdateMs });
    await expect(zoePage.getByText(fr.Room.inactiveResultsMessage)).toBeVisible();
    await zoePage.context().close();
  });

  test('a racer who typed recently shows no removal control', async ({ browser, page }) => {
    const { roomId, zoePage, zoe } = await lobbyWithZoe(page, browser);
    await startRaceInDatabase(roomId, 2_500);
    await expect(timer(page)).toHaveText(fr.Room.go, { timeout: raceOpensWithinMs });

    await expect(racerRow(page, zoe)).toBeVisible();
    await expect(removeFromRace(page, zoe)).toHaveCount(0);
    await zoePage.context().close();
  });
});
