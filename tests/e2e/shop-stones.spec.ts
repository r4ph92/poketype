import { expect, test, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { expectNoAccessibilityViolations } from './support/axe';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { parseCssColor, themeColors } from './support/contrast';
import { enterAsGuest, uniqueName, withTestDatabase } from './support/guests';
import { addMemberToRoom, openRoomAsNewGuest, startRaceInDatabase } from './support/rooms';
import { finishRaceInDatabase } from './support/settlement';
import { findGuestIdNamed, givePokemon, readCollectionOf } from './support/trainer';

const amount = (value: number) => new Intl.NumberFormat('fr').format(value);

function message(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), template);
}

async function enterWith(page: Page, coins: number, stones: Record<string, number> = {}): Promise<string> {
  const name = uniqueName('Alex ');
  await enterAsGuest(page, name);
  const guestId = await findGuestIdNamed(name);
  await withTestDatabase(async (sql) => {
    await sql`update guests set coins = ${coins} where id = ${guestId}`;
    for (const [item, quantity] of Object.entries(stones)) await sql`insert into bag_items (guest_id, item, quantity) values (${guestId}, ${item}, ${quantity})`;
  });
  return guestId;
}

async function coinsOf(guestId: string): Promise<number> {
  const [row] = await withTestDatabase((sql) => sql`select coins from guests where id = ${guestId}`);
  return row!.coins as number;
}

async function quantityOf(guestId: string, item: string): Promise<number> {
  const [row] = await withTestDatabase((sql) => sql`select quantity from bag_items where guest_id = ${guestId} and item = ${item}`);
  return (row?.quantity as number | undefined) ?? 0;
}

const shopPanel = (page: Page) => page.getByRole('region', { name: fr.Shop.title, exact: true });
const bagPanel = (page: Page) => page.getByRole('region', { name: fr.Shop.bagTitle, exact: true });
const purchaseDialog = (page: Page) => page.getByRole('dialog');

async function openPurchase(page: Page, item: keyof typeof fr.Shop.items): Promise<void> {
  await page.getByRole('button', { name: message(fr.Shop.buyItem, { item: fr.Shop.items[item] }), exact: true }).click();
  await expect(purchaseDialog(page)).toBeVisible();
}

async function inspect(page: Page, dex: number): Promise<void> {
  await page.goto('/play/collection');
  await page.getByRole('button', { name: message(fr.Trainer.inspect, { name: fr.Trainer.species[String(dex) as '1'] }) }).click();
}

test.describe('Poké Dollars on the results and the hub', () => {
  test('a race shows "+200 ₽" and the first badge bonus beside the XP, the same after a reload, and the hub shows the balance', async ({ page }) => {
    const host = uniqueName('Alex ');
    const rival = uniqueName('Zoe ');
    const roomId = await openRoomAsNewGuest(page, host);
    await addMemberToRoom(roomId, rival);
    await startRaceInDatabase(roomId, -60_000);
    await finishRaceInDatabase(roomId, [
      { trainerName: host, elapsedMs: 30_000, rejectedKeystrokes: 0 },
      { trainerName: rival, elapsedMs: 40_000, rejectedKeystrokes: 0 },
    ]);

    await expect(page.locator('.coin-reward-gain')).toHaveText(message(fr.Room.coinsGained, { amount: 200 }));
    await expect(page.locator('.coin-reward-bonus')).toHaveText(message(fr.Room.badgeCoinsGained, { amount: 500 }));
    await page.reload();
    await expect(page.locator('.coin-reward-gain')).toHaveText(message(fr.Room.coinsGained, { amount: 200 }));
    expect(await coinsOf(await findGuestIdNamed(host))).toBe(700);

    await page.goto('/play');
    const wallet = page.getByRole('region', { name: fr.Trainer.wallet, exact: true });
    await expect(wallet.locator('.coin-balance')).toHaveText(message(fr.Trainer.coinAmount, { amount: 700 }));
    await wallet.getByRole('link', { name: fr.Trainer.shopLink }).click();
    await expect(page).toHaveURL('/play/shop');
    await expect(page.getByRole('link', { name: fr.Header.tabs.shop, exact: true })).toHaveAttribute('aria-current', 'page');
  });
});

test.describe('the shop', () => {
  test('buying a Fire Stone takes 1 500 ₽ and puts it in the bag; a quantity the wallet cannot pay cannot be confirmed', async ({ page }) => {
    const guestId = await enterWith(page, 2000);
    await page.getByRole('navigation', { name: fr.Header.navLabel }).getByRole('link', { name: fr.Header.tabs.shop, exact: true }).click();
    await expect(shopPanel(page).locator('.coin-balance')).toHaveText(message(fr.Shop.balance, { amount: amount(2000) }));
    await expect(bagPanel(page)).toContainText(fr.Shop.bagEmpty);
    await expectEveryVisibleStringFromCatalog(page);
    await expectNoAccessibilityViolations(page);

    await openPurchase(page, 'fire-stone');
    await purchaseDialog(page).getByLabel(fr.Shop.quantity).fill('2');
    await expect(purchaseDialog(page)).toContainText(message(fr.Shop.total, { amount: amount(3000) }));
    await expect(purchaseDialog(page)).toContainText(fr.Shop.notEnough);
    await expect(purchaseDialog(page).getByRole('button', { name: fr.Shop.confirm })).toHaveAttribute('aria-disabled', 'true');
    await purchaseDialog(page).getByLabel(fr.Shop.quantity).press('Enter');
    await expect(purchaseDialog(page)).toBeVisible();
    expect(await coinsOf(guestId)).toBe(2000);

    await purchaseDialog(page).getByLabel(fr.Shop.quantity).fill('1');
    await purchaseDialog(page).getByRole('button', { name: fr.Shop.confirm }).dblclick();
    await expect(page.getByRole('status').filter({ hasText: message(fr.Shop.bought, { quantity: 1, item: fr.Shop.items['fire-stone'] }) })).toBeVisible();
    await expect(purchaseDialog(page)).toBeHidden();
    await expect(shopPanel(page).locator('.coin-balance')).toHaveText(message(fr.Shop.balance, { amount: 500 }));
    await expect(bagPanel(page)).toContainText(fr.Shop.items['fire-stone']);
    await expect(bagPanel(page)).toContainText(message(fr.Shop.bagCount, { count: 1 }));
    expect(await coinsOf(guestId)).toBe(500);
    expect(await quantityOf(guestId, 'fire-stone')).toBe(1);
  });

  test('Poké Balls cost 5 ₽ each and are shown in the bag', async ({ page }) => {
    const guestId = await enterWith(page, 100);
    await page.goto('/play/shop');
    await openPurchase(page, 'poke-ball');
    await purchaseDialog(page).getByLabel(fr.Shop.quantity).fill('20');
    await purchaseDialog(page).getByRole('button', { name: fr.Shop.confirm }).click();
    await expect(bagPanel(page)).toContainText(message(fr.Shop.bagCount, { count: 20 }));
    expect(await coinsOf(guestId)).toBe(0);
  });

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`keeps the theme tokens and readable contrast in the ${colorScheme} theme`, async ({ browser }) => {
      const page = await (await browser.newContext({ colorScheme })).newPage();
      await enterWith(page, 1500, { 'moon-stone': 2, 'poke-ball': 5 });
      await page.goto('/play/shop');
      const tokens = themeColors(colorScheme);
      const balance = shopPanel(page).locator('.coin-balance');
      expect(parseCssColor(await balance.evaluate((element) => getComputedStyle(element).backgroundColor))).toEqual(tokens.get('gold'));
      expect(parseCssColor(await balance.evaluate((element) => getComputedStyle(element).color))).toEqual(tokens.get('on-gold'));
      await expectNoAccessibilityViolations(page);
      await page.screenshot({ path: `test-results/shop-${colorScheme}.png`, fullPage: true, animations: 'disabled' });
      await page.context().close();
    });
  }
});

test.describe('using a stone from the collection', () => {
  test('"Utiliser une Pierre Feu" evolves Vulpix into Ninetales with the evolution scene and uses the stone', async ({ page }) => {
    const guestId = await enterWith(page, 0, { 'fire-stone': 1 });
    await givePokemon(guestId, 37, 12);
    await inspect(page, 37);
    await expectEveryVisibleStringFromCatalog(page, ['0', '—']);
    await page.getByRole('button', { name: message(fr.Trainer.useStone, { stone: fr.Shop.items['fire-stone'] }) }).click();

    const celebration = page.getByRole('dialog', { name: fr.Trainer.evolutionTitle });
    await expect(celebration).toBeVisible();
    await expect(celebration.locator('.stone-evolution')).toHaveAttribute('data-animated', 'true');
    await expect(celebration.locator('[data-evolution="evolving"]')).toBeVisible();
    await expect(celebration.locator('.xp-evolved')).toHaveText(message(fr.Trainer.stoneEvolved, { from: fr.Trainer.species['37'], to: fr.Trainer.species['38'] }));
    await expectNoAccessibilityViolations(page);
    await celebration.getByRole('button', { name: fr.Trainer.evolutionClose }).click();

    await expect(page.getByRole('region', { name: fr.Trainer.species['38'], exact: true })).toBeVisible();
    expect((await readCollectionOf(guestId)).map((pokemon) => pokemon.dex)).toEqual([4, 38]);
    expect(await quantityOf(guestId, 'fire-stone')).toBe(0);
  });

  test('Eevee lets the trainer choose the stone; a missing stone points to the shop', async ({ page }) => {
    const guestId = await enterWith(page, 0, { 'water-stone': 1, 'fire-stone': 1 });
    await givePokemon(guestId, 133, 10);
    await inspect(page, 133);
    await expect(page.getByRole('button', { name: message(fr.Trainer.useStone, { stone: fr.Shop.items['water-stone'] }) })).toBeVisible();
    await expect(page.getByText(message(fr.Trainer.stoneMissing, { stone: fr.Shop.items['thunder-stone'], into: fr.Trainer.species['135'] }))).toBeVisible();
    await page.getByRole('button', { name: message(fr.Trainer.useStone, { stone: fr.Shop.items['fire-stone'] }) }).click();
    await page.getByRole('dialog', { name: fr.Trainer.evolutionTitle }).getByRole('button', { name: fr.Trainer.evolutionClose }).click();
    expect((await readCollectionOf(guestId)).map((pokemon) => pokemon.dex)).toEqual([4, 136]);
    expect(await quantityOf(guestId, 'water-stone')).toBe(1);
  });

  test('owning the evolved form already says the stone stays in the bag and offers no button', async ({ page }) => {
    const guestId = await enterWith(page, 0, { 'leaf-stone': 1 });
    await givePokemon(guestId, 44, 20);
    await givePokemon(guestId, 45, 20);
    await inspect(page, 44);
    await expect(page.getByText(message(fr.Trainer.stoneAlreadyOwned, { into: fr.Trainer.species['45'], stone: fr.Shop.items['leaf-stone'] }))).toBeVisible();
    await expect(page.getByRole('button', { name: message(fr.Trainer.useStone, { stone: fr.Shop.items['leaf-stone'] }) })).toHaveCount(0);
  });

  test('under reduced motion the evolved form shows at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const guestId = await enterWith(page, 0, { 'moon-stone': 1 });
    await givePokemon(guestId, 35, 8);
    await inspect(page, 35);
    await page.getByRole('button', { name: message(fr.Trainer.useStone, { stone: fr.Shop.items['moon-stone'] }) }).click();
    const celebration = page.getByRole('dialog', { name: fr.Trainer.evolutionTitle });
    await expect(celebration.locator('.stone-evolution')).toHaveAttribute('data-animated', 'false');
    await expect(celebration.locator('[data-evolution="evolved"]')).toBeVisible();
    await expect(celebration.locator('.xp-evolved')).toHaveText(message(fr.Trainer.stoneEvolved, { from: fr.Trainer.species['35'], to: fr.Trainer.species['36'] }));
  });
});
