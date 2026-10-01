import { expect, test, type Page } from '@playwright/test';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { uniqueName } from './support/guests';
import { switchInterfaceTo } from './support/locale';
import { editableElements, installRaceHarness, readTimerChanges, timer } from './support/race';
import { openRoomAsNewGuest, playerRows, startRaceInDatabase, testPassage } from './support/rooms';

const passage = (page: Page) => page.locator('#passage-heading + p');

async function openRoomWithHarness(page: Page, trainerName: string): Promise<string> {
  await installRaceHarness(page.context());
  return openRoomAsNewGuest(page, trainerName);
}

test.describe('the race start view', () => {
  test('when the race starts, the open room switches to the French race view with its title, focus and passage', async ({ page }) => {
    const alex = uniqueName('Alex ');
    const roomId = await openRoomWithHarness(page, alex);

    await startRaceInDatabase(roomId, 6_000);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.Room.raceHeading);
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    await expect(page).toHaveTitle(fr.Metadata.raceTitle);
    await expect(passage(page)).toHaveText(testPassage);
    await expect(passage(page)).toHaveAttribute('lang', 'fr');
    await expect(playerRows(page)).toHaveCount(1);
    await expect(timer(page)).toHaveText(fr.Room.getReady);
    await expectEveryVisibleStringFromCatalog(page, [alex, testPassage]);

    await expect(timer(page)).toHaveText('3');
    await expectEveryVisibleStringFromCatalog(page, [alex, testPassage]);
    await expect(timer(page)).toHaveText(fr.Room.go, { timeout: 5_000 });
    await expectEveryVisibleStringFromCatalog(page, [alex, testPassage]);
    await expect(page.locator('main').locator(editableElements)).toHaveCount(0);
  });

  test('a player who reloads during the race goes straight to "Partez !" with the same passage, never a negative count', async ({ page }) => {
    const roomId = await openRoomWithHarness(page, uniqueName('Alex '));
    await startRaceInDatabase(roomId, -5_000);

    await page.reload();
    await expect(timer(page)).toHaveText(fr.Room.go);
    await expect(passage(page)).toHaveText(testPassage);
    await expect(page).toHaveTitle(fr.Metadata.raceTitle);
    const shown = (await readTimerChanges(page)).map((change) => change.text);
    expect(shown.filter((text) => /\d/.test(text))).toEqual([]);
  });

  test('a player who reloads during the countdown sees the remaining seconds, not a restart', async ({ page }) => {
    const roomId = await openRoomWithHarness(page, uniqueName('Alex '));
    await startRaceInDatabase(roomId, 1_900);

    await page.reload();
    await expect(timer(page)).toHaveText(fr.Room.go, { timeout: 5_000 });
    const shown = (await readTimerChanges(page)).map((change) => change.text);
    expect(shown).not.toContain('3');
    expect(shown).toContain('1');
    expect(shown.at(-1)).toBe(fr.Room.go);
  });

  test('in English the race screens are English and the passage keeps lang="fr"', async ({ page }) => {
    const alex = uniqueName('Alex ');
    const roomId = await openRoomWithHarness(page, alex);
    await switchInterfaceTo(page, 'en');

    await startRaceInDatabase(roomId, 4_000);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.Room.raceHeading);
    await expect(page).toHaveTitle(en.Metadata.raceTitle);
    await expect(passage(page)).toHaveAttribute('lang', 'fr');
    await expectEveryVisibleStringFromCatalog(page, [alex, testPassage], 'en');
    await expect(timer(page)).toHaveText(en.Room.go, { timeout: 6_000 });
    await expectEveryVisibleStringFromCatalog(page, [alex, testPassage], 'en');
  });
});
