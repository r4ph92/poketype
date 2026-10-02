import { expect, test } from '@playwright/test';
import fr from '../../messages/fr.json';
import { enterAsGuest, uniqueName } from './support/guests';
import { timer, typingArea } from './support/race';
import { expectedResultCells, readResultCells, resultsTable } from './support/results';
import { createRoom, playerRows } from './support/rooms';
import { readSettledRace } from './support/settlement';
import { chooseStarterOnScreen } from './support/trainer';

const raceOpensWithinMs = 8_000;
const resultsWithinMs = 2_000;
const typingDelayMs = 60;

// The whole journey through the real interface, with no database shortcut: two browsers, two guests, one race.
// The clipboard is refused so Alex reads the link from the field the page then shows, as a child would copy it by hand.
test('two guests race end to end: guest entry, create, join from the link, start, type, results', async ({ browser, page }) => {
  const alex = uniqueName('Alex ');
  const zoe = uniqueName('Zoé ');
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } });
  });
  await enterAsGuest(page, alex);
  const roomId = await createRoom(page);
  await page.getByRole('button', { name: fr.Room.copyLink }).click();
  const roomLink = await page.getByLabel(fr.Room.linkLabel).inputValue();

  const zoePage = await (await browser.newContext()).newPage();
  await zoePage.goto(roomLink);
  await zoePage.getByLabel(fr.GuestEntry.label).fill(zoe);
  await zoePage.getByRole('button', { name: fr.GuestEntry.submit }).click();
  await chooseStarterOnScreen(zoePage, 7);
  await expect(zoePage).toHaveURL(roomLink);
  await expect(playerRows(page)).toHaveCount(2);

  await page.getByRole('button', { name: fr.Room.startRace }).click();
  for (const shown of [page, zoePage]) {
    await expect(timer(shown)).toHaveText(fr.Room.go, { timeout: raceOpensWithinMs });
    await expect(typingArea(shown)).toBeFocused();
  }
  const passage = (await page.locator('#passage-text').textContent())!;
  expect(await zoePage.locator('#passage-text').textContent()).toBe(passage);
  await Promise.all([page.keyboard.type(passage, { delay: typingDelayMs }), zoePage.keyboard.type(passage, { delay: typingDelayMs })]);

  for (const shown of [page, zoePage]) await expect(resultsTable(shown)).toBeVisible({ timeout: resultsWithinMs });
  const expected = expectedResultCells((await readSettledRace(roomId)).results, 'fr');
  expect(expected.map(([, name]) => name).sort()).toEqual([alex, zoe].sort());
  expect(await readResultCells(page)).toEqual(expected);
  expect(await readResultCells(zoePage)).toEqual(expected);
  await zoePage.context().close();
});
