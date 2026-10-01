import { expect, test } from '@playwright/test';
import fr from '../../messages/fr.json';
import { expectNoAccessibilityViolations } from './support/axe';
import { uniqueName } from './support/guests';
import { addMemberToRoom, openRoomAsNewGuest, roomPagePath, startRaceInDatabase } from './support/rooms';
import { finishRaceInDatabase } from './support/settlement';

for (const width of [375, 1440]) {
  test(`post-race podium and actions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1024 });
    const names = [uniqueName('Alex '), uniqueName('Zoe '), uniqueName('Maya '), uniqueName('Leo ')];
    const roomId = await openRoomAsNewGuest(page, names[0]!);
    for (const name of names.slice(1)) await addMemberToRoom(roomId, name);
    await startRaceInDatabase(roomId, -90_000);
    await finishRaceInDatabase(roomId, names.map((trainerName, index) => ({ trainerName, elapsedMs: [36_000, 30_000, 42_000, 50_000][index]!, rejectedKeystrokes: index })));
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.Room.resultsHeading);
    await expect(page.locator('.podium-racer')).toHaveCount(3);
    await expect(page.locator('.podium-racer').first()).toContainText(names[1]!);
    await expect(page.locator('.podium-racer[data-viewer="true"] .podium-step')).toHaveText('2');
    await expect(page.locator('.performance-rank')).toHaveText('2');
    await expect(page.locator('.results-table tbody tr')).toHaveCount(4);
    await expect(page.getByRole('columnheader', { name: fr.Room.timeColumn, exact: true })).toBeHidden();
    await page.getByRole('button', { name: fr.Room.showRaceDetails }).click();
    await expect(page.getByRole('columnheader', { name: fr.Room.timeColumn, exact: true })).toBeVisible();
    await page.getByRole('button', { name: fr.Room.hideRaceDetails }).click();
    await expect(page.getByText(fr.Room.rewardsHint)).toBeVisible();
    await expect(page.getByRole('link', { name: fr.Room.viewCollection })).toHaveAttribute('href', '/play/collection');
    await expect(page.getByRole('link', { name: fr.Room.backToCamp })).toHaveAttribute('href', '/play');
    await expect.poll(() => page.locator('img').evaluateAll((images) => images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
    expect(await page.locator('#race-standings').evaluate((table) => table.scrollWidth <= table.parentElement!.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expectNoAccessibilityViolations(page);
    await page.screenshot({ path: `test-results/race-results-${width}.png`, fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: fr.Room.raceAgain, exact: true }).click();
    await expect(page).toHaveURL(/\/rooms\/[0-9a-f-]+$/);
    await expect(page).not.toHaveURL(roomPagePath(roomId));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.Room.heading);
  });
}

test('shared places remain shared on the podium', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  const names = [uniqueName('Alex '), uniqueName('Zoe '), uniqueName('Maya ')];
  const roomId = await openRoomAsNewGuest(page, names[0]!);
  for (const name of names.slice(1)) await addMemberToRoom(roomId, name);
  await startRaceInDatabase(roomId, -90_000);
  await finishRaceInDatabase(roomId, names.map((trainerName) => ({ trainerName, elapsedMs: 30_000, rejectedKeystrokes: 0 })));
  await page.reload();
  await expect(page.locator('.podium-step[data-rank="1"]')).toHaveCount(3);
  await expect(page.locator('.performance-rank')).toHaveText('1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.podium-sprite').first()).toHaveCSS('animation-name', 'none');
});
