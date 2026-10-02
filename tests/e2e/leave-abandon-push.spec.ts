import { expect, test } from '@playwright/test';
import fr from '../../messages/fr.json';
import { recordPageFrames, revisionPingsIn, subscriptionCount } from './support/push';
import { resultsTable } from './support/results';
import { finishRaceInDatabase } from './support/settlement';
import { newGuestPage, openRoomAsNewGuest, playerRows, roomPagePath } from './support/rooms';
import { racerRow, startTwoPlayerRace } from './support/typing';
import { uniqueName } from './support/guests';

const catchUpBoundMs = 2_000;

test.describe('leave and abandon by push', () => {
  test('Alex sees Zoe abandon, then the race settle, with his snapshot reads cut until a ping arrives', async ({ browser, page }) => {
    const alexFrames = recordPageFrames(page);
    const { alexPage, zoePage, roomId, alex, zoe } = await startTwoPlayerRace(browser, page);
    await expect.poll(() => subscriptionCount(alexFrames, roomId), { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
    const pingsBefore = revisionPingsIn(alexFrames, roomId).length;
    const hasPing = () => revisionPingsIn(alexFrames, roomId).length > pingsBefore;
    await alexPage.route('**/snapshot', (route) => (hasPing() ? route.continue() : route.abort()));

    await zoePage.getByRole('button', { name: fr.Room.abandonRace }).click();
    await zoePage.getByRole('dialog', { name: fr.Room.abandonTitle }).getByRole('button', { name: fr.Room.confirmAbandon }).click();
    await expect.poll(hasPing, { timeout: catchUpBoundMs }).toBe(true);
    await expect(racerRow(alexPage, zoe).getByText(fr.Room.abandoned)).toBeVisible({ timeout: catchUpBoundMs });

    await finishRaceInDatabase(roomId, [{ trainerName: alex, elapsedMs: 20_000, rejectedKeystrokes: 0 }]);
    await expect(resultsTable(zoePage)).toBeVisible({ timeout: catchUpBoundMs });
    await zoePage.context().close();
  });

  test('Alex sees Zoe leave the waiting room by push, with his snapshot reads cut until the ping arrives', async ({ browser, page }) => {
    const alexFrames = recordPageFrames(page);
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    await expect.poll(() => subscriptionCount(alexFrames, roomId), { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    await zoePage.goto(roomPagePath(roomId));
    await expect(playerRows(page)).toHaveCount(2);
    const pingsBefore = revisionPingsIn(alexFrames, roomId).length;
    const hasPing = () => revisionPingsIn(alexFrames, roomId).length > pingsBefore;
    await page.route('**/snapshot', (route) => (hasPing() ? route.continue() : route.abort()));

    await zoePage.getByRole('button', { name: fr.Room.leaveRoom }).click();
    await expect.poll(hasPing, { timeout: catchUpBoundMs }).toBe(true);
    await expect(playerRows(page)).toHaveCount(1, { timeout: catchUpBoundMs });
    await zoePage.context().close();
  });
});
