import { expect, test, type Page } from '@playwright/test';
import { addBotToRoom } from './support/bots';
import { enterAsGuest, uniqueName } from './support/guests';
import { insertWaitingEncounter } from './support/encounters';
import { addMemberToRoom, openRoomAsNewGuest, startRaceInDatabase } from './support/rooms';
import { finishRaceInDatabase } from './support/settlement';
import { expectNoSpriteClipping, setPartnerOf } from './support/sprite-clipping';
import { findGuestIdNamed, givePokemon } from './support/trainer';

const kyurem = 646;
const lugia = 249;
const hoOh = 250;
const dialga = 483;
const giratina = 487;
const wailord = 321;
const gyarados = 130;
const onix = 95;
const rayquaza = 384;
const pichu = 172;
const caterpie = 10;
const bulbasaur = 1;

const rivalPartners = [hoOh, lugia, dialga, wailord, gyarados];

async function seatRivalsWithGiants(roomId: string): Promise<string[]> {
  const names = rivalPartners.map((_, index) => uniqueName(`Rival${index} `));
  for (const [index, name] of names.entries()) {
    await addMemberToRoom(roomId, name);
    await setPartnerOf(name, rivalPartners[index]!);
  }
  return names;
}

for (const width of [375, 1440]) {
  test.describe(`giant Pokémon at ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
    });

    test('lobby cards are equally tall and keep every giant inside, in the card and in the profile', async ({ page }) => {
      const host = uniqueName('Host ');
      const roomId = await openRoomAsNewGuest(page, host);
      await setPartnerOf(host, lugia);
      await addBotToRoom(roomId, 'ghetsis', 'expert');
      await addBotToRoom(roomId, 'cyrus', 'expert');
      for (const dex of [onix, wailord]) {
        const name = uniqueName('Mate ');
        await addMemberToRoom(roomId, name);
        await setPartnerOf(name, dex);
      }
      await page.reload();
      await expect(page.locator('.lobby-player')).toHaveCount(5);

      await expectNoSpriteClipping(page, 5);
      const heights = await page.locator('.lobby-player').evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().height));
      expect(new Set(heights).size).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/giant-sprites-lobby-${width}.png`, fullPage: true, animations: 'disabled' });

      for (const card of await page.locator('.lobby-player').all()) {
        await card.click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expectNoSpriteClipping(page, 6);
        await page.keyboard.press('Escape');
      }
    });

    test('small species stay large in the lobby cards and the leader bar, and cards stay equally tall', async ({ page }) => {
      const host = uniqueName('Host ');
      const roomId = await openRoomAsNewGuest(page, host);
      await setPartnerOf(host, pichu);
      for (const dex of [caterpie, bulbasaur, kyurem]) {
        const name = uniqueName('Mate ');
        await addMemberToRoom(roomId, name);
        await setPartnerOf(name, dex);
      }
      await page.reload();
      await expect(page.locator('.lobby-player [data-species]')).toHaveCount(4);
      await expectSmallSpeciesScaledUp(page, '.lobby-player');
      const heights = await page.locator('.lobby-player').evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().height));
      expect(new Set(heights).size).toBe(1);

      await startRaceInDatabase(roomId, 0);
      await expect(page.locator('.leader-marker [data-species]').nth(2)).toBeVisible();
      await expectSmallSpeciesScaledUp(page, '.leader-marker');
      await expectNoSpriteClipping(page, 3);
    });

    test('the race map and the leader bar keep every giant inside', async ({ page }) => {
      const host = uniqueName('Host ');
      const roomId = await openRoomAsNewGuest(page, host);
      await setPartnerOf(host, giratina);
      await seatRivalsWithGiants(roomId);
      await startRaceInDatabase(roomId, 0);
      await expect(page.locator('.route-player [data-species="giratina"]')).toBeVisible();
      await expect(page.locator('.leader-marker [data-species]').nth(2)).toBeVisible();

      await expectNoSpriteClipping(page, 5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/giant-sprites-race-${width}.png`, fullPage: true, animations: 'disabled' });
    });

    test('the podium and the results rows keep every giant inside', async ({ page }) => {
      const host = uniqueName('Host ');
      const roomId = await openRoomAsNewGuest(page, host);
      await setPartnerOf(host, kyurem);
      const rivals = await seatRivalsWithGiants(roomId);
      await startRaceInDatabase(roomId, -90_000);
      await finishRaceInDatabase(roomId, [host, ...rivals].map((trainerName, index) => ({ trainerName, elapsedMs: 30_000 + index * 2_000, rejectedKeystrokes: 0 })));
      await page.reload();
      await expect(page.locator('.podium-racer')).toHaveCount(3);
      await expect(page.locator('.results-table tbody tr')).toHaveCount(6);
      await expect.poll(() => page.locator('img').evaluateAll((images) => images.every((image) => image instanceof HTMLImageElement && image.complete))).toBe(true);

      await expectNoSpriteClipping(page, 9);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/giant-sprites-results-${width}.png`, fullPage: true, animations: 'disabled' });
    });

    test('the camp, the collection, the Pokédex and the encounter keep every giant inside', async ({ page }) => {
      const name = uniqueName('Fan ');
      await enterAsGuest(page, name);
      const guestId = await findGuestIdNamed(name);
      await setPartnerOf(name, kyurem);
      for (const dex of [lugia, hoOh, dialga, giratina, wailord, rayquaza]) await givePokemon(guestId, dex);
      await insertWaitingEncounter(guestId, { dex: kyurem, level: 5 });

      await page.goto('/play');
      await expectNoSpriteClipping(page, 2);
      await page.screenshot({ path: `test-results/giant-sprites-camp-${width}.png`, fullPage: true, animations: 'disabled' });

      await page.goto('/play/collection');
      await expectNoSpriteClipping(page, 5);
      await selectEveryPokemon(page);
      await page.screenshot({ path: `test-results/giant-sprites-collection-${width}.png`, fullPage: true, animations: 'disabled' });

      await page.goto('/play/pokedex');
      await expectNoSpriteClipping(page, 5);
    });
  });
}

async function selectEveryPokemon(page: Page): Promise<void> {
  for (const slot of await page.locator('button.pokemon-slot').all()) {
    await slot.click();
    await expectNoSpriteClipping(page, 5);
  }
}

// Giants draw at scale 1; every other species must use at least scale 2.
async function expectSmallSpeciesScaledUp(page: Page, container: string): Promise<void> {
  const scales = await page.locator(`${container} [data-species]`).evaluateAll((sprites) => sprites.map((sprite) => [sprite.getAttribute('data-species'), Number(sprite.getAttribute('data-scale'))] as const));
  for (const [species, scale] of scales) {
    if (species === 'kyurem') expect(scale).toBe(1);
    else expect(scale, `${species} in ${container}`).toBeGreaterThanOrEqual(2);
  }
}
