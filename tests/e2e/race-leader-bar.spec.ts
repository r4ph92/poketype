import { expect, test, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { expectNoAccessibilityViolations } from './support/axe';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { uniqueName, withTestDatabase } from './support/guests';
import { passageFragments, timer, typingArea } from './support/race';
import { fillRoomTo, openRoomAsNewGuest, startRaceInDatabase, testPassage } from './support/rooms';

const rivals = ['Rival 1', 'Rival 2', 'Rival 3', 'Rival 4'];
const placeOf = (place: number) => fr.Room.leaderPlace.replace('{place}', String(place));
const leaderBar = (page: Page) => page.getByRole('region', { name: fr.Room.leaderBoard });
const markers = (page: Page) => leaderBar(page).locator('[data-leader]');
const marker = (page: Page, trainerName: string) => markers(page).filter({ hasText: trainerName });

async function setRivalPosition(roomId: string, trainerName: string, position: number): Promise<void> {
  await withTestDatabase(async (sql) => {
    await sql`
      update race_participants p set position = ${position}, keystrokes = ${position}
      from guests g
      where g.id = p.guest_id and g.trainer_name = ${trainerName}
        and p.race_id = (select id from races where room_id = ${roomId} order by created_at desc limit 1)`;
    await sql`update rooms set revision = revision + 1 where id = ${roomId}`;
  });
}

async function expectMarkers(page: Page, expected: [string, number][]): Promise<void> {
  await expect(markers(page)).toHaveCount(expected.length);
  for (const [trainerName, place] of expected) await expect(marker(page, trainerName)).toHaveAttribute('data-place', String(place));
}

test('the race map shows only the viewer, and the leader bar shows the top three plus the viewer and follows typing progress', async ({ page }) => {
  const alex = uniqueName('Alex ');
  const roomId = await openRoomAsNewGuest(page, alex);
  await fillRoomTo(roomId, 5, 'Rival ');
  await startRaceInDatabase(roomId, 0);
  await expect(timer(page)).toHaveText(fr.Room.go);
  for (const [index, rival] of rivals.entries()) await setRivalPosition(roomId, rival, 40 - index * 10);

  await expect(page.locator('.route-player')).toHaveCount(1);
  await expect(page.locator('.route-player[data-viewer="true"]')).toBeVisible();
  await expect(page.locator('.route-player canvas[data-trainer-avatar]')).toHaveCount(1);
  await expectMarkers(page, [['Rival 1', 1], ['Rival 2', 2], ['Rival 3', 3], [alex, 5]]);
  await expect(marker(page, alex)).toHaveAttribute('data-viewer', 'true');
  await expect(marker(page, alex)).toContainText(placeOf(5));
  await expect(marker(page, alex)).toHaveAttribute('data-share', '0');

  await typingArea(page).focus();
  await page.keyboard.type(testPassage.slice(0, 25), { delay: 30 });
  await expectMarkers(page, [['Rival 1', 1], ['Rival 2', 2], [alex, 3]]);
  await expect(marker(page, alex)).toHaveAttribute('data-share', String(Math.round((25 / testPassage.length) * 100)));

  await setRivalPosition(roomId, 'Rival 4', 60);
  await expectMarkers(page, [['Rival 4', 1], ['Rival 1', 2], ['Rival 2', 3], [alex, 4]]);

  await expectEveryVisibleStringFromCatalog(page, [alex, ...rivals, ...passageFragments(testPassage)]);
  await expectNoAccessibilityViolations(page);
  await page.screenshot({ path: 'test-results/race-leader-bar.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/race-leader-bar-375.png', fullPage: true, animations: 'disabled' });
});
