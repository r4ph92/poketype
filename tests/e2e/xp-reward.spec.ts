import { expect, test, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { expectNoAccessibilityViolations } from './support/axe';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { parseCssColor, themeColors } from './support/contrast';
import { uniqueName, withTestDatabase } from './support/guests';
import { addMemberToRoom, openRoomAsNewGuest, startRaceInDatabase } from './support/rooms';
import { finishRaceInDatabase } from './support/settlement';
import { findGuestIdNamed, readCollectionOf } from './support/trainer';

type RewardRoom = { roomId: string; host: string; rival: string; hostId: string };

const reveal = (page: Page) => page.locator('.xp-reward');

// The host races Charmander, set to the level and XP given, against a rival without a Pokémon; the host wins.
async function rewardRoom(page: Page, level: number, xp: number): Promise<RewardRoom> {
  const host = uniqueName('Alex ');
  const rival = uniqueName('Zoe ');
  const roomId = await openRoomAsNewGuest(page, host);
  await addMemberToRoom(roomId, rival);
  const hostId = await findGuestIdNamed(host);
  await withTestDatabase((sql) => sql`update owned_pokemon set level = ${level}, xp = ${xp} where guest_id = ${hostId} and is_partner`);
  return { roomId, host, rival, hostId };
}

async function finishRace({ roomId, host, rival }: RewardRoom): Promise<void> {
  await startRaceInDatabase(roomId, -60_000);
  await finishRaceInDatabase(roomId, [
    { trainerName: host, elapsedMs: 30_000, rejectedKeystrokes: 0 },
    { trainerName: rival, elapsedMs: 40_000, rejectedKeystrokes: 0 },
  ]);
}

function message(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), template);
}

async function countGrantsOf(guestId: string): Promise<number> {
  const [row] = await withTestDatabase((sql) => sql`select count(*)::int as total from xp_grants where guest_id = ${guestId}`);
  return row!.total as number;
}

const evolvedMessage = message(fr.Room.evolvesInto, { from: fr.Pokemon.charmander, to: fr.Pokemon.charmeleon });

test.describe('the XP reward on the results screen', () => {
  test('results arriving live fill the XP bar, flash the new level and evolve Charmander; a reload shows the final state and grants nothing more', async ({ page }) => {
    const room = await rewardRoom(page, 15, 150);
    await finishRace(room);

    await expect(reveal(page)).toHaveAttribute('data-animated', 'true');
    await expect(page.locator('.xp-reward-gain')).toHaveText(message(fr.Room.xpGained, { xp: 150 }));
    await expect(page.locator('.xp-level-up')).toHaveText(message(fr.Room.levelUp, { level: 16 }));
    await expect(page.locator('.xp-reward-pokemon')).toHaveAttribute('data-evolution', 'evolving');
    await expect(page.locator('.xp-evolved')).toHaveText(evolvedMessage);
    await expect(reveal(page).getByText(message(fr.Room.xpAmount, { current: 100, total: 210 }))).toBeVisible();
    await expectEveryVisibleStringFromCatalog(page, [room.host, room.rival, ...(await page.locator('.results-standings td, .results-performance dd, .results-recap dd, .performance-rank, .podium-step').allTextContents())]);
    await expectNoAccessibilityViolations(page);

    await page.reload();
    await expect(reveal(page)).toHaveAttribute('data-animated', 'false');
    await expect(page.locator('.xp-reward-pokemon')).toHaveAttribute('data-evolution', 'evolved');
    await expect(page.locator('.xp-evolved')).toHaveText(evolvedMessage);
    await expect(reveal(page).getByText(message(fr.Room.xpAmount, { current: 100, total: 210 }))).toBeVisible();
    expect(await countGrantsOf(room.hostId)).toBe(1);
    expect(await readCollectionOf(room.hostId)).toEqual([{ dex: 5, level: 16, xp: 100, isPartner: true }]);
  });

  test('under reduced motion the final state shows at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const room = await rewardRoom(page, 1, 0);
    await finishRace(room);

    await expect(reveal(page)).toBeVisible();
    expect(await reveal(page).getAttribute('data-animated')).toBe('false');
    expect(await page.locator('.xp-level-up').textContent()).toBe(message(fr.Room.levelUp, { level: 3 }));
    await expect(reveal(page).getByText(message(fr.Room.xpAmount, { current: 20, total: 80 }))).toBeVisible();
    await expect(page.locator('.xp-level-up')).toHaveCSS('animation-name', 'none');
  });

  test('the hub shows the evolved partner with its real level and XP, the race XP and the form it evolved from', async ({ page }) => {
    const room = await rewardRoom(page, 15, 150);
    await finishRace(room);
    await page.goto('/play');
    const partner = page.getByRole('region', { name: fr.Trainer.partner, exact: true });
    await expect(partner.getByRole('heading', { name: fr.Trainer.species['5'] })).toBeVisible();
    await expect(partner.getByText(message(fr.Trainer.level, { level: 16 }), { exact: true })).toBeVisible();
    await expect(partner.getByText(message(fr.Trainer.xpAmount, { current: 100, total: 210 }), { exact: true })).toBeVisible();
    await expect(partner.locator('.evolution-form img')).toHaveCount(2);
    await expect(page.getByRole('region', { name: fr.Trainer.recentRaces, exact: true })).toContainText(message(fr.Trainer.xpEarned, { xp: 150 }));
  });
});

test.describe('the XP reward in light and dark themes', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`keeps the theme tokens and readable contrast in the ${colorScheme} theme`, async ({ browser }) => {
      const page = await (await browser.newContext({ colorScheme })).newPage();
      const room = await rewardRoom(page, 15, 150);
      await finishRace(room);
      await page.reload();
      await expect(page.locator('.xp-evolved')).toHaveText(evolvedMessage);
      const tokens = themeColors(colorScheme);
      expect(parseCssColor(await page.locator('.xp-reward-gain').evaluate((element) => getComputedStyle(element).color))).toEqual(tokens.get('xp'));
      expect(parseCssColor(await page.locator('.xp-evolved').evaluate((element) => getComputedStyle(element).color))).toEqual(tokens.get('success'));
      await expectNoAccessibilityViolations(page);
      await page.screenshot({ path: `test-results/xp-reward-${colorScheme}.png`, fullPage: true, animations: 'disabled' });
      await page.context().close();
    });
  }
});
