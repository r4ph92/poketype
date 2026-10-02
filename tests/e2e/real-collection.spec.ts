import { expect, test, type Browser, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { signUp, uniquePassword, uniqueUsername } from './support/accounts';
import { expectNoAccessibilityViolations } from './support/axe';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { enterAsGuest, submitTrainerName, uniqueName } from './support/guests';
import { timer } from './support/race';
import { createRoom, playerRows, readRoomCode, roomPagePath, startRaceInDatabase } from './support/rooms';
import { finishRaceInDatabase } from './support/settlement';
import { chooseStarterOnScreen, findGuestIdNamed, readCollectionOf, readHubNumbers, starterScreen } from './support/trainer';

async function newGuest(browser: Browser, name: string, starter: 1 | 4 | 7): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await enterAsGuest(page, name, starter);
  return page;
}

test.describe('choosing a starter', () => {
  test('a new guest picks one of the three starters before the hub, and it is saved as their partner', async ({ page }) => {
    const name = uniqueName('Alex ');
    await submitTrainerName(page, name);
    await expect(page).toHaveURL('/play/choose-starter');
    await expect(page).toHaveTitle(fr.ChooseStarter.title);
    await expect(page.getByRole('radio')).toHaveCount(3);
    await expectEveryVisibleStringFromCatalog(page, [name]);
    await expectNoAccessibilityViolations(page);
    await page.goto('/play');
    await expect(page).toHaveURL(starterScreen);
    await chooseStarterOnScreen(page, 1);
    await expect(page).toHaveURL('/play');
    await expect(page.getByRole('region', { name: fr.Trainer.partner, exact: true }).getByRole('heading', { name: fr.Trainer.species['1'] })).toBeVisible();
    expect(await readCollectionOf(await findGuestIdNamed(name))).toEqual([{ dex: 1, level: 5, xp: 0, isPartner: true }]);
    await page.goto('/play/choose-starter');
    await expect(page).toHaveURL('/play');
  });

  test('a friend opening an invitation picks a starter first and then lands in the room with their partner', async ({ browser, page }) => {
    await enterAsGuest(page, uniqueName('Alex '));
    const roomId = await createRoom(page);
    const zoePage = await (await browser.newContext()).newPage();
    await zoePage.goto(roomPagePath(roomId));
    await zoePage.getByLabel(fr.GuestEntry.label).fill(uniqueName('Zoé '));
    await zoePage.getByRole('button', { name: fr.GuestEntry.submit }).click();
    await expect(zoePage).toHaveURL(`/play/choose-starter?next=room%3A${roomId}`);
    await chooseStarterOnScreen(zoePage, 7);
    await expect(zoePage).toHaveURL(roomPagePath(roomId));
    await expect(page.locator('.lobby-player [data-species="squirtle"]')).toHaveCount(1);
    await expect(page.locator('.lobby-player [data-species="charmander"]')).toHaveCount(1);
    await zoePage.context().close();
  });

  test('a guest who chose a starter keeps it when opening an account', async ({ page }) => {
    await enterAsGuest(page, uniqueName('Alex '), 7);
    await signUp(page, { username: uniqueUsername('Keep_'), password: uniquePassword() });
    await expect(page.getByRole('region', { name: fr.Trainer.partner, exact: true }).getByRole('heading', { name: fr.Trainer.species['7'] })).toBeVisible();
  });
});

test.describe('each player races with their own partner', () => {
  test('the lobby profile, the race map and the leader bar show every player\'s partner', async ({ browser, page }) => {
    const [alex, zoe] = [uniqueName('Alex '), uniqueName('Zoé ')];
    await enterAsGuest(page, alex, 4);
    const roomId = await createRoom(page);
    const zoePage = await newGuest(browser, zoe, 1);
    await zoePage.goto(roomPagePath(roomId));
    await expect(playerRows(page)).toHaveCount(2);

    await page.getByRole('button', { name: fr.Lobby.openProfile.replace('{name}', alex), exact: true }).click();
    const profile = page.getByRole('dialog', { name: alex });
    await expect(profile.getByRole('heading', { name: fr.Lobby.buddy.replace('{name}', fr.Pokemon.charmander) })).toBeVisible();
    await expect(profile.locator('dd')).toHaveText(['5', fr.Lobby.noValue, fr.Lobby.noValue, '0', '0']);
    await expectEveryVisibleStringFromCatalog(page, [alex, zoe, await readRoomCode(roomId), ...(await profile.locator('dd').allTextContents())]);
    await page.keyboard.press('Escape');

    await startRaceInDatabase(roomId, 2_500);
    await expect(timer(page)).toHaveText(fr.Room.go, { timeout: 8_000 });
    await expect(page.locator('[data-racer][data-viewer="true"] [data-species="charmander"]')).toHaveCount(1);
    await expect(zoePage.locator('[data-racer][data-viewer="true"] [data-species="bulbasaur"]')).toHaveCount(1);
    await expect(zoePage.locator('[data-leader] [data-species="charmander"]')).toHaveCount(1);
    await zoePage.context().close();
  });
});

test.describe('the hub after real races', () => {
  test('shows the settled race in recent races and statistics, and grants the Boulder Badge', async ({ browser, page }) => {
    const [alex, zoe] = [uniqueName('Alex '), uniqueName('Zoé ')];
    await enterAsGuest(page, alex);
    const roomId = await createRoom(page);
    const zoePage = await newGuest(browser, zoe, 7);
    await zoePage.goto(roomPagePath(roomId));
    await zoePage.context().close();
    await startRaceInDatabase(roomId, -60_000);
    await finishRaceInDatabase(roomId, [
      { trainerName: alex, elapsedMs: 30_000, rejectedKeystrokes: 0 },
      { trainerName: zoe, elapsedMs: 40_000, rejectedKeystrokes: 3 },
    ]);
    await page.goto('/play');
    const recent = page.getByRole('region', { name: fr.Trainer.recentRaces, exact: true });
    await expect(recent.locator('tbody tr')).toHaveCount(1);
    await expect(recent.locator('.rank-token')).toHaveText('1er');
    await expect(page.getByRole('region', { name: fr.Trainer.stats, exact: true }).locator('dd').first()).toHaveText('1');
    await expect(page.getByRole('region', { name: fr.Trainer.badgesTitle, exact: true })).toContainText('1 / 8');
    await expect(page.getByRole('button', { name: `${fr.Trainer.badges.boulder} — ${fr.Trainer.earned}` })).toBeVisible();
    await expectEveryVisibleStringFromCatalog(page, [alex, ...(await readHubNumbers(page))]);
  });
});

test.describe('light and dark themes', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`the starter screen and the hub keep readable contrast in the ${colorScheme} theme`, async ({ browser }) => {
      const page = await (await browser.newContext({ colorScheme })).newPage();
      await submitTrainerName(page, uniqueName('Alex '));
      await expect(page).toHaveURL(starterScreen);
      await expectNoAccessibilityViolations(page);
      await page.screenshot({ path: `test-results/choose-starter-${colorScheme}.png`, fullPage: true, animations: 'disabled' });
      await chooseStarterOnScreen(page);
      await expect(page).toHaveURL('/play');
      await expectNoAccessibilityViolations(page);
      await page.screenshot({ path: `test-results/trainer-hub-${colorScheme}.png`, fullPage: true, animations: 'disabled' });
      await page.context().close();
    });
  }
});
