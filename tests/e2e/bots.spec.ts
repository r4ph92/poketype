import { expect, test, type Page } from '@playwright/test';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { gameConfig } from '../../src/config/game';
import { expectNoAccessibilityViolations } from './support/axe';
import { addBotToRoom, readRoomBots } from './support/bots';
import { contrastRatio, parseCssColor } from './support/contrast';
import { uniqueName } from './support/guests';
import { setLocaleCookie } from './support/locale';
import { timer } from './support/race';
import { resultsTable } from './support/results';
import { openRoomAsNewGuest } from './support/rooms';

const raceOpensWithinMs = 8_000;
const typingDelayMs = 60;

const lobbyCards = (page: Page) => page.locator('.lobby-player');
const botCards = (page: Page) => page.locator('.lobby-player[data-bot]');
const leaderBar = (page: Page) => page.getByRole('region', { name: fr.Room.leaderBoard });

type Level = keyof typeof fr.Bots.levels;

function addLevelName(level: Level): string {
  const { min, max } = gameConfig.bots.levels[level].wpmRange;
  return fr.Bots.addLevel.replace('{level}', fr.Bots.levels[level]).replace('{wpm}', max === null ? `${min}+` : `${min}–${max}`);
}

function botLabel(level: Level): string {
  return fr.Bots.botLabel.replace('{level}', fr.Bots.levels[level]);
}

test.describe('bots in the lobby', () => {
  test('the host adds a bot by level, sees it tagged with its Pokémon and profile, may start with it alone, then removes it', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Host '));
    await expect(page.getByText(fr.Room.needMorePlayers.replace('{count}', '2'))).toBeVisible();

    await page.getByRole('button', { name: addLevelName('noob'), exact: true }).click();

    await expect(botCards(page)).toHaveCount(1);
    const [bot] = await readRoomBots(roomId);
    expect(bot!.level).toBe('noob');
    await expect(botCards(page).locator('.bot-tag')).toHaveText(botLabel('noob'));
    await expect(botCards(page).locator('canvas')).toHaveCount(0);
    await expect(botCards(page).locator('[data-species]')).toHaveCount(1);
    await expect(page.getByText(fr.Room.needMorePlayers.replace('{count}', '2'))).toHaveCount(0);
    await expectNoAccessibilityViolations(page);
    await page.screenshot({ path: 'test-results/bots-lobby.png', fullPage: true, animations: 'disabled' });

    await botCards(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(botLabel('noob'), { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');

    const name = (await botCards(page).locator('.lobby-player-name').textContent())!;
    await page.getByRole('button', { name: fr.Lobby.removePlayerLabel.replace('{name}', name), exact: true }).click();
    await expect(botCards(page)).toHaveCount(0);
    await expect(lobbyCards(page)).toHaveCount(1);
  });

  test('says when every trainer of a level is already in the room', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Host '));
    for (const character of ['giovanni', 'maxie', 'archie', 'cyrus', 'ghetsis', 'n'] as const) await addBotToRoom(roomId, character, 'impossible');
    await expect(botCards(page)).toHaveCount(6);

    await page.getByRole('button', { name: addLevelName('impossible'), exact: true }).click();

    await expect(page.getByRole('alert').filter({ hasText: fr.Bots.levelFull })).toBeVisible();
    await expect(botCards(page)).toHaveCount(6);
  });

  test('shows a bot under its English name in the English interface', async ({ page, context }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Host '));
    await addBotToRoom(roomId, 'brock', 'noob');
    await setLocaleCookie(context, 'en');
    await page.reload();

    await expect(botCards(page).locator('.lobby-player-name')).toHaveText('Brock');
    await expect(page.getByRole('region', { name: en.Bots.panelTitle })).toBeVisible();
  });

  test('the bot tag keeps a readable contrast in the light and the dark theme', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Host '));
    await addBotToRoom(roomId, 'misty', 'noob');
    const tag = botCards(page).locator('.bot-tag');
    await expect(tag).toBeVisible();
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      const colors = await tag.evaluate((element) => ({ text: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor }));
      expect(contrastRatio(parseCssColor(colors.text), parseCssColor(colors.background))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

test('one player races two bots: the leader bar tags them, the race ends when the player finishes, and the results tag both bots', async ({ page }) => {
  test.setTimeout(60_000);
  const roomId = await openRoomAsNewGuest(page, uniqueName('Solo '));
  await addBotToRoom(roomId, 'giovanni', 'impossible');
  await addBotToRoom(roomId, 'brock', 'noob');
  await expect(botCards(page)).toHaveCount(2);

  await page.getByRole('button', { name: fr.Room.startRace }).click();
  await expect(timer(page)).toHaveText(fr.Room.go, { timeout: raceOpensWithinMs });
  await expect(leaderBar(page).locator('[data-leader][data-bot]')).toHaveCount(2);
  await expect(leaderBar(page).locator('[data-leader="bot-giovanni"] .bot-tag')).toHaveText(botLabel('impossible'));
  await expect.poll(() => leaderBar(page).locator('[data-leader="bot-giovanni"]').getAttribute('data-share').then(Number)).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/bots-race.png', animations: 'disabled' });

  const passage = (await page.locator('#passage-text').textContent())!;
  await page.keyboard.type(passage, { delay: typingDelayMs });

  await expect(resultsTable(page)).toBeVisible({ timeout: 5_000 });
  for (const level of ['impossible', 'noob'] as const) await expect(resultsTable(page).getByText(botLabel(level), { exact: true })).toHaveCount(1);
  await expect(page.locator('.podium-name .bot-tag')).toHaveCount(2);
  await expectNoAccessibilityViolations(page);
  await page.screenshot({ path: 'test-results/bots-results.png', fullPage: true, animations: 'disabled' });
});
