import { expect, test, type APIResponse, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { uniqueName } from './support/guests';
import { readResultCells, resultsTable } from './support/results';
import { finishRaceInDatabase } from './support/settlement';
import { countMembersOf, newGuestPage, playerCountText, playerRows, readRoomCode, readRoomPhase, readRoomRevision, roomPagePath, snapshotPath, startRaceInDatabase } from './support/rooms';
import { startTwoPlayerRace, type TwoPlayerRace } from './support/typing';

const liveUpdateMs = 2_000;

const lobbyHeading = (page: Page) => page.getByRole('heading', { level: 1, name: fr.Room.heading });

const prepareButton = (page: Page) => page.getByRole('button', { name: fr.Room.prepareRace });

function postPrepare(page: Page, roomId: string, contentType = 'application/json'): Promise<APIResponse> {
  return page.request.post(`/api/rooms/${roomId}/prepare`, { headers: { origin: new URL(page.url()).origin, 'content-type': contentType }, data: '{}' });
}

async function readRaceResultsAddress(page: Page): Promise<string> {
  return (await page.getByRole('link', { name: fr.Room.raceResultsLink }).getAttribute('href'))!;
}

// Zoe abandons and keeps watching; Alex finishes, so both pages show the results.
async function raceWithZoeAbandoning(race: TwoPlayerRace): Promise<void> {
  await race.zoePage.getByRole('button', { name: fr.Room.abandonRace }).click();
  await race.zoePage.getByRole('dialog', { name: fr.Room.abandonTitle }).getByRole('button', { name: fr.Room.confirmAbandon }).click();
  await expect(race.zoePage.getByText(fr.Room.abandonedBanner)).toBeVisible();
  await finishRaceInDatabase(race.roomId, [{ trainerName: race.alex, elapsedMs: 20_000, rejectedKeystrokes: 0 }]);
  for (const shown of [race.alexPage, race.zoePage]) await expect(resultsTable(shown)).toBeVisible({ timeout: liveUpdateMs });
}

test('Alex prepares a new race and both pages return to the lobby in French, while Zoe only waits for the host', async ({ browser, page }) => {
  const race = await startTwoPlayerRace(browser, page);
  await finishRaceInDatabase(race.roomId, [race.alex, race.zoe].map((trainerName, index) => ({ trainerName, elapsedMs: 20_000 + index * 5_000, rejectedKeystrokes: 0 })));
  for (const shown of [race.alexPage, race.zoePage]) await expect(resultsTable(shown)).toBeVisible({ timeout: liveUpdateMs });

  await expect(race.zoePage.getByText(fr.Room.waitingForHost)).toBeVisible();
  await expect(prepareButton(race.zoePage)).toHaveCount(0);
  await expect(race.zoePage.getByRole('button', { name: fr.Room.leaveRoom })).toBeVisible();
  await expect(race.alexPage.getByText(fr.Room.waitingForHost)).toHaveCount(0);

  await prepareButton(race.alexPage).click();

  for (const shown of [race.alexPage, race.zoePage]) {
    await expect(lobbyHeading(shown)).toBeVisible({ timeout: liveUpdateMs });
    await expect(lobbyHeading(shown)).toBeFocused();
    await expect(shown).toHaveURL(roomPagePath(race.roomId));
    await expect(shown.getByText(playerCountText(2))).toBeVisible();
    await expect(shown).toHaveTitle(fr.Metadata.roomTitle);
  }
  await expect(race.alexPage.getByRole('button', { name: fr.Room.startRace })).toBeVisible();
  await expect(race.zoePage.getByText(fr.Room.hostWillStart)).toBeVisible();
  await expectEveryVisibleStringFromCatalog(race.zoePage, [race.alex, race.zoe, await readRoomCode(race.roomId)]);
  await race.alexPage.reload();
  await expect(lobbyHeading(race.alexPage)).toBeVisible();
  await expect(lobbyHeading(race.alexPage)).not.toBeFocused();
  await race.zoePage.context().close();
});

test('Zoe, who abandoned, is sent home with a notice when Alex prepares, and only comes back through the link', async ({ browser, page }) => {
  const race = await startTwoPlayerRace(browser, page);
  await raceWithZoeAbandoning(race);

  await prepareButton(race.alexPage).click();

  await expect(race.zoePage).toHaveURL('/play', { timeout: liveUpdateMs });
  await expect(race.zoePage.getByText(fr.Play.removedAfterAbandon)).toBeVisible();
  await expect(playerRows(race.alexPage)).toHaveCount(1, { timeout: liveUpdateMs });
  expect(await countMembersOf(race.roomId)).toBe(1);
  await race.zoePage.reload();
  await expect(race.zoePage.getByText(fr.Play.removedAfterAbandon)).toHaveCount(0);

  await race.zoePage.goto(roomPagePath(race.roomId));
  await expect(playerRows(race.zoePage)).toHaveCount(2);
  await race.zoePage.context().close();
});

test('the first race keeps its results address for its racers once the next race runs, and nobody else can read it', async ({ browser, page }) => {
  const race = await startTwoPlayerRace(browser, page);
  await raceWithZoeAbandoning(race);
  const address = await readRaceResultsAddress(race.alexPage);
  const firstResults = await readResultCells(race.alexPage);
  await prepareButton(race.alexPage).click();
  await expect(lobbyHeading(race.alexPage)).toBeVisible({ timeout: liveUpdateMs });

  await race.zoePage.goto(address);
  await expect(resultsTable(race.zoePage)).toBeVisible();
  expect((await readResultCells(race.zoePage)).map((row) => row[1])).toEqual([race.alex, race.zoe]);
  expect(await countMembersOf(race.roomId)).toBe(1);

  await startRaceInDatabase(race.roomId, 60_000);
  await race.alexPage.goto(address);
  expect(await readResultCells(race.alexPage)).toEqual(firstResults);
  await expect(race.alexPage.getByRole('link', { name: fr.Room.backToCamp })).toBeVisible();
  await expect(prepareButton(race.alexPage)).toHaveCount(0);

  const outsider = await newGuestPage(browser, uniqueName('Max '));
  const response = await outsider.goto(address);
  expect(response!.status()).toBe(404);
  await expect(outsider.getByRole('heading', { name: fr.Room.notFoundHeading })).toBeVisible();
  await expect(outsider.getByText(race.alex)).toHaveCount(0);
  await expect(resultsTable(outsider)).toHaveCount(0);
  await Promise.all([race.zoePage.context().close(), outsider.context().close()]);
});

test('the prepare endpoint refuses Zoe, a request without JSON and a room still racing, and tells a removed abandoner why', async ({ browser, page }) => {
  const race = await startTwoPlayerRace(browser, page);
  expect((await postPrepare(race.alexPage, race.roomId)).status()).toBe(409);
  await raceWithZoeAbandoning(race);
  const revisionBefore = await readRoomRevision(race.roomId);

  const refusal = await postPrepare(race.zoePage, race.roomId);
  expect(refusal.status()).toBe(403);
  expect(await refusal.body()).toHaveLength(0);
  expect((await postPrepare(race.alexPage, race.roomId, 'text/plain')).status()).toBe(415);
  expect(await readRoomPhase(race.roomId)).toBe('results');
  expect(await readRoomRevision(race.roomId)).toBe(revisionBefore);

  await race.zoePage.goto('/play');
  expect((await postPrepare(race.alexPage, race.roomId)).status()).toBe(200);
  const snapshot = await race.zoePage.request.get(snapshotPath(race.roomId));
  expect(snapshot.status()).toBe(403);
  expect(await snapshot.json()).toEqual({ reason: 'abandoned' });
  await race.zoePage.context().close();
});
