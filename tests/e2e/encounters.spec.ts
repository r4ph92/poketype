import { expect, test, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { expectNoAccessibilityViolations } from './support/axe';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { parseCssColor, themeColors } from './support/contrast';
import { ballsOf, fillCollectionTo, giveBalls, insertWaitingEncounter, pcBoxesOf, readEncountersOf } from './support/encounters';
import { enterAsGuest, uniqueName, withTestDatabase } from './support/guests';
import { addMemberToRoom, openRoomAsNewGuest, startRaceInDatabase } from './support/rooms';
import { finishRaceInDatabase } from './support/settlement';
import { findGuestIdNamed, givePokemon, insertFinishedRaces, readCollectionOf } from './support/trainer';

function message(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), template);
}

const speciesName = (dex: number) => fr.Trainer.species[String(dex) as '1'];
const encounterPanel = (page: Page) => page.getByRole('region', { name: fr.Encounter.title, exact: true });
const rewardsPanel = (page: Page) => page.getByRole('region', { name: fr.Room.raceRewards });

async function enterWithEncounter(page: Page, balls: number, dex = 19): Promise<{ guestId: string; encounterId: string }> {
  const name = uniqueName('Alex ');
  await enterAsGuest(page, name);
  const guestId = await findGuestIdNamed(name);
  await giveBalls(guestId, balls);
  const encounterId = await insertWaitingEncounter(guestId, { dex, level: 3 });
  await page.goto('/play');
  return { guestId, encounterId };
}

// Finishes a race of two straight in the database with the page's trainer first, so the results arrive on the open page.
async function winRace(page: Page, prepare: (guestId: string) => Promise<void> = async () => {}): Promise<string> {
  const host = uniqueName('Alex ');
  const rival = uniqueName('Zoe ');
  const roomId = await openRoomAsNewGuest(page, host);
  const guestId = await findGuestIdNamed(host);
  await prepare(guestId);
  await addMemberToRoom(roomId, rival);
  await startRaceInDatabase(roomId, -60_000);
  await finishRaceInDatabase(roomId, [
    { trainerName: host, elapsedMs: 30_000, rejectedKeystrokes: 0 },
    { trainerName: rival, elapsedMs: 40_000, rejectedKeystrokes: 0 },
  ]);
  return guestId;
}

test.describe('a wild encounter after a race', () => {
  test('the results announce it and lead to the hub, where throwing ends in a catch or a flight within three balls', async ({ page }) => {
    const guestId = await winRace(page);
    const [encounter] = await readEncountersOf(guestId);
    const rewards = rewardsPanel(page);
    await expect(rewards.getByText(fr.Room.encounterAppeared)).toBeVisible();
    await expect(rewards.getByText(message(fr.Room.encounterDetail, { name: speciesName(encounter!.dex), level: encounter!.level }))).toBeVisible();
    await page.reload();
    await expect(rewardsPanel(page).getByText(fr.Room.encounterAppeared)).toBeVisible();

    await giveBalls(guestId, 5);
    await rewardsPanel(page).getByRole('link', { name: fr.Room.encounterLink }).click();
    await expect(page).toHaveURL(/\/play#encounter$/);
    const panel = encounterPanel(page);
    await expect(panel.getByText(message(fr.Encounter.appeared, { name: speciesName(encounter!.dex) }))).toBeVisible();
    await expectEveryVisibleStringFromCatalog(page);
    await expectNoAccessibilityViolations(page);

    for (let throwNumber = 1; throwNumber <= 3; throwNumber += 1) {
      const [current] = await readEncountersOf(guestId);
      if (current!.status !== 'waiting') break;
      await panel.getByRole('button', { name: fr.Encounter.throw }).click();
      await expect.poll(async () => (await readEncountersOf(guestId))[0]!.throwsUsed).toBe(throwNumber);
      await expect(panel.getByRole('status')).toBeVisible();
    }
    const [finished] = await readEncountersOf(guestId);
    expect(['caught', 'fled']).toContain(finished!.status);
    expect(await ballsOf(guestId)).toBe(5 - finished!.throwsUsed);
    const outcome = finished!.status === 'caught' ? fr.Encounter.result.caught : fr.Encounter.result.fled;
    await expect(panel.getByRole('status')).toHaveText(message(outcome, { name: speciesName(finished!.dex) }));
    await expect(panel.getByRole('button', { name: fr.Encounter.throw })).toHaveCount(0);
  });

  test('a double click on the throw spends one ball', async ({ page }) => {
    const { guestId } = await enterWithEncounter(page, 5, 147);
    await encounterPanel(page).getByRole('button', { name: fr.Encounter.throw }).dblclick();
    await expect(encounterPanel(page).getByRole('status')).toBeVisible();
    await expect.poll(() => ballsOf(guestId)).toBe(4);
    expect((await readEncountersOf(guestId))[0]!.throwsUsed).toBe(1);
  });

  test('without a ball it points to the shop and waits; letting it go closes it', async ({ page }) => {
    const { guestId } = await enterWithEncounter(page, 0);
    const panel = encounterPanel(page);
    await expect(panel.getByText(fr.Encounter.noBall)).toBeVisible();
    await expect(panel.getByRole('link', { name: fr.Trainer.shopLink })).toHaveAttribute('href', '/play/shop');
    await expect(panel.getByRole('button', { name: fr.Encounter.throw })).toHaveCount(0);
    await panel.getByRole('button', { name: fr.Encounter.letGo }).click();
    await expect(panel.getByRole('status')).toHaveText(message(fr.Encounter.letGoDone, { name: speciesName(19) }));
    expect((await readEncountersOf(guestId))[0]!.status).toBe('let-go');
  });

  test('a full PC holds the throw until a PC Box is bought in the shop', async ({ page }) => {
    const { guestId } = await enterWithEncounter(page, 2);
    await fillCollectionTo(guestId, 30);
    await withTestDatabase((sql) => sql`update guests set coins = 200 where id = ${guestId}`);
    await page.reload();
    const panel = encounterPanel(page);
    await expect(panel.getByText(fr.Encounter.pcFull)).toBeVisible();
    await panel.getByRole('link', { name: fr.Trainer.buyBox }).click();
    await expect(page).toHaveURL('/play/shop');
    await expect(page.getByText(message(fr.Shop.ownedBoxes, { count: 1 }))).toBeVisible();
    await page.getByRole('button', { name: message(fr.Shop.buyItem, { item: fr.Shop.items['pc-box'] }), exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: fr.Shop.confirm }).click();
    await expect(page.getByText(message(fr.Shop.ownedBoxes, { count: 2 }))).toBeVisible();
    expect(await pcBoxesOf(guestId)).toBe(2);
    await page.goto('/play');
    await expect(encounterPanel(page).getByRole('button', { name: fr.Encounter.throw })).toBeVisible();
  });

  test('under reduced motion the ball shows the outcome without wobbling', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await enterWithEncounter(page, 1);
    await encounterPanel(page).getByRole('button', { name: fr.Encounter.throw }).click();
    await expect(page.locator('.encounter-message')).toHaveAttribute('data-animated', 'false');
  });

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`the hub encounter panel uses the theme tokens in ${colorScheme} mode`, async ({ browser }) => {
      const page = await (await browser.newContext({ colorScheme })).newPage();
      await enterWithEncounter(page, 3, 25);
      const tokens = themeColors(colorScheme);
      const art = page.locator('.encounter-art');
      expect(parseCssColor(await art.evaluate((element) => getComputedStyle(element).backgroundColor))).toEqual(tokens.get('sage'));
      await expectNoAccessibilityViolations(page);
      await page.screenshot({ path: `test-results/encounter-${colorScheme}.png`, fullPage: true, animations: 'disabled' });
      await page.context().close();
    });
  }
});

test.describe('the PC', () => {
  test('shows the box with its free slots, releases a Pokémon after confirming, and never offers to release the partner', async ({ page }) => {
    const name = uniqueName('Alex ');
    await enterAsGuest(page, name);
    const guestId = await findGuestIdNamed(name);
    await givePokemon(guestId, 25, 7);
    await givePokemon(guestId, 25, 3);
    await page.goto('/play/collection');
    const storage = page.getByRole('region', { name: fr.Trainer.storage, exact: true });
    await expect(storage.getByText(message(fr.Trainer.slotsUsed, { count: 3, capacity: 30 }))).toBeVisible();
    await expect(page.getByText(fr.Trainer.partnerNoRelease)).toBeVisible();
    await expectEveryVisibleStringFromCatalog(page, ['0', '—']);

    await storage.getByRole('button', { name: message(fr.Trainer.inspect, { name: speciesName(25) }) }).first().click();
    await page.getByRole('button', { name: fr.Trainer.release, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: message(fr.Trainer.releaseTitle, { name: speciesName(25) }) });
    await expect(dialog).toBeVisible();
    await expectNoAccessibilityViolations(page);
    await dialog.getByRole('button', { name: fr.Trainer.releaseConfirm }).click();
    await expect(dialog).toBeHidden();
    await expect(storage.getByText(message(fr.Trainer.slotsUsed, { count: 2, capacity: 30 }))).toBeVisible();
    expect((await readCollectionOf(guestId)).map((pokemon) => pokemon.dex)).toEqual([4, 25]);
  });
});

test.describe('a Kanto legendary', () => {
  test('releasing a legendary needs a second warning, and "Garder" keeps it', async ({ page }) => {
    const name = uniqueName('Alex ');
    await enterAsGuest(page, name);
    const guestId = await findGuestIdNamed(name);
    await givePokemon(guestId, 144, 5);
    await page.goto('/play/collection');
    const storage = page.getByRole('region', { name: fr.Trainer.storage, exact: true });
    await storage.getByRole('button', { name: message(fr.Trainer.inspect, { name: speciesName(144) }) }).first().click();
    await page.getByRole('button', { name: fr.Trainer.release, exact: true }).click();
    await page.getByRole('dialog', { name: message(fr.Trainer.releaseTitle, { name: speciesName(144) }) }).getByRole('button', { name: fr.Trainer.releaseConfirm }).click();

    const warning = page.getByRole('dialog', { name: message(fr.Trainer.releaseTitle, { name: speciesName(144) }) });
    await expect(warning.getByText(message(fr.Trainer.legendaryReleaseMessage, { name: speciesName(144) }))).toBeVisible();
    await expect(warning.getByRole('button', { name: fr.Trainer.legendaryReleaseKeep })).toBeFocused();
    await expectNoAccessibilityViolations(page);
    await warning.getByRole('button', { name: fr.Trainer.legendaryReleaseKeep }).click();
    await expect(warning).toBeHidden();
    expect((await readCollectionOf(guestId)).some((pokemon) => pokemon.dex === 144)).toBe(true);
  });

  test('confirming both dialogs releases the legendary', async ({ page }) => {
    const name = uniqueName('Alex ');
    await enterAsGuest(page, name);
    const guestId = await findGuestIdNamed(name);
    await givePokemon(guestId, 144, 5);
    await page.goto('/play/collection');
    const storage = page.getByRole('region', { name: fr.Trainer.storage, exact: true });
    await storage.getByRole('button', { name: message(fr.Trainer.inspect, { name: speciesName(144) }) }).first().click();
    await page.getByRole('button', { name: fr.Trainer.release, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: message(fr.Trainer.releaseTitle, { name: speciesName(144) }) });
    await dialog.getByRole('button', { name: fr.Trainer.releaseConfirm }).click();
    await dialog.getByRole('button', { name: message(fr.Trainer.legendaryReleaseConfirm, { name: speciesName(144) }) }).click();
    await expect(dialog).toBeHidden();
    expect((await readCollectionOf(guestId)).some((pokemon) => pokemon.dex === 144)).toBe(false);
  });

  test('the race that meets its goals announces "Artikodin rejoint ton équipe !" and the achievements page shows it obtained', async ({ page }) => {
    const guestId = await winRace(page, async (veteran) => {
      const [room] = await withTestDatabase((sql) => sql`select room_id from room_members where guest_id = ${veteran} limit 1`);
      await insertFinishedRaces(veteran, room!.room_id as string, 49);
    });
    await expect(rewardsPanel(page).getByText(message(fr.Room.legendaryJoined, { name: fr.Pokemon.articuno }))).toBeVisible();
    const tokens = themeColors('light');
    const title = page.locator('.discovery[data-legendary="true"] .discovery-title');
    expect(parseCssColor(await title.evaluate((element) => getComputedStyle(element).backgroundColor))).toEqual(tokens.get('cream-deep'));
    expect((await readCollectionOf(guestId)).some((pokemon) => pokemon.dex === 144 && pokemon.level === 5)).toBe(true);

    await page.goto('/play/achievements');
    const goal = page.getByRole('region', { name: fr.Pokemon.articuno, exact: true });
    await expect(goal.getByText(fr.Achievements.obtained)).toBeVisible();
    await expect(page.getByRole('region', { name: fr.Pokemon.zapdos, exact: true })).toHaveCount(0);
  });
});
