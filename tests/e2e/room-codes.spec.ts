import { expect, test, type Browser, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { gameConfig } from '../../src/config/game';
import { expectNoAccessibilityViolations } from './support/axe';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { parseCssColor, sameColor, themeColors, type ColorScheme } from './support/contrast';
import { enterAsGuest, uniqueName, withTestDatabase } from './support/guests';
import {
  chooseVisibility,
  confirmCreateRoom,
  createRoom,
  createRoomDialog,
  fillRoomTo,
  insertRoomCodeFailures,
  newGuestPage,
  playerCountText,
  playerRows,
  readRoomAccess,
  readRoomCode,
  roomPagePath,
  setRoomPhase,
} from './support/rooms';

const liveUpdateMs = 3_000;
const codeField = (page: Page) => page.getByLabel(fr.RoomAccess.joinLabel);
const codeError = (page: Page) => page.locator('form').filter({ has: codeField(page) }).getByRole('alert');
const visibilityRadio = (page: Page, name: string) => page.getByRole('radio', { name });
const visibilityGroup = (page: Page) => page.getByRole('group', { name: fr.RoomAccess.visibilityLegend });
const roomCode = (page: Page) => page.locator('.lobby-invite-code');

async function submitCode(page: Page, typed: string): Promise<void> {
  await codeField(page).fill(typed);
  await page.getByRole('button', { name: fr.RoomAccess.joinSubmit }).click();
}

async function openUnlistedRoom(page: Page, trainerName: string): Promise<{ roomId: string; code: string }> {
  await enterAsGuest(page, trainerName);
  const roomId = await createRoom(page, 'unlisted');
  return { roomId, code: await readRoomCode(roomId) };
}

async function guestIdNamed(trainerName: string): Promise<string> {
  return withTestDatabase(async (sql) => (await sql`select id from guests where trainer_name = ${trainerName}`)[0]!.id as string);
}

async function guestAt(browser: Browser, trainerName: string, path: string): Promise<Page> {
  const page = await newGuestPage(browser, trainerName);
  await page.goto(path);
  return page;
}

test.describe('an unlisted room joined with its code', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('Alex picks "Non listée" in the French dialog, his lobby shows the 6-character code and copies it', async ({ page }) => {
    const alex = uniqueName('Alex ');
    await enterAsGuest(page, alex);
    await page.getByRole('button', { name: fr.Play.createRoom }).click();

    const dialog = createRoomDialog(page);
    await expect(dialog).toBeVisible();
    await expect(visibilityRadio(page, fr.RoomAccess.public)).toBeChecked();
    await expectEveryVisibleStringFromCatalog(page, [alex]);
    await expectNoAccessibilityViolations(page);
    await confirmCreateRoom(page, 'unlisted');

    await expect(page).toHaveURL(/\/rooms\//);
    const roomId = new URL(page.url()).pathname.split('/').pop()!;
    const { code, visibility } = await readRoomAccess(roomId);
    expect(visibility).toBe('unlisted');
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    await expect(roomCode(page)).toHaveText(code);
    await expect(visibilityRadio(page, fr.RoomAccess.unlisted)).toBeChecked();

    await page.getByRole('button', { name: fr.Lobby.copyCode }).click();
    await expect(page.getByText(fr.Lobby.codeCopied)).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
    await expectEveryVisibleStringFromCatalog(page, [alex, code]);
    await expectNoAccessibilityViolations(page);
  });

  test('"Annuler" closes the dialog without creating a room', async ({ page }) => {
    await enterAsGuest(page, uniqueName('Alex '));
    await page.getByRole('button', { name: fr.Play.createRoom }).click();
    await createRoomDialog(page).getByRole('button', { name: fr.RoomAccess.cancel }).click();

    await expect(createRoomDialog(page)).toBeHidden();
    await expect(page).toHaveURL('/play');
  });

  test('Zoe types the code in lower case on the hub and Nina types it on the Race tab: both join Alex', async ({ browser, page }) => {
    const { roomId, code } = await openUnlistedRoom(page, uniqueName('Alex '));

    const zoe = await guestAt(browser, uniqueName('Zoé '), '/play');
    await submitCode(zoe, ` ${code.toLowerCase()} `);
    await expect(zoe).toHaveURL(roomPagePath(roomId));

    const nina = await guestAt(browser, uniqueName('Nina '), '/play/race');
    await submitCode(nina, code);
    await expect(nina).toHaveURL(roomPagePath(roomId));

    await expect(page.getByText(playerCountText(3), { exact: true }).first()).toBeVisible({ timeout: liveUpdateMs });
    await zoe.context().close();
    await nina.context().close();
  });

  test('the unlisted room never shows in the public list of the Race tab', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    await openUnlistedRoom(page, alex);

    const zoe = await guestAt(browser, uniqueName('Zoé '), '/play/race');

    await expect(zoe.getByRole('heading', { name: fr.PublicRooms.heading })).toBeVisible();
    await expect(zoe.getByText(fr.PublicRooms.roomOf.replace('{name}', alex))).toHaveCount(0);
    await zoe.context().close();
  });

  test('a wrong code, a started race and a full room each get their French message and join nothing', async ({ browser, page }) => {
    const zoeName = uniqueName('Zoé ');
    const zoe = await guestAt(browser, zoeName, '/play');
    const started = await openUnlistedRoom(page, uniqueName('Alex '));
    await setRoomPhase(started.roomId, 'countdown');
    const maxPage = await (await browser.newContext()).newPage();
    const full = await openUnlistedRoom(maxPage, uniqueName('Max '));
    await fillRoomTo(full.roomId, gameConfig.rooms.capacity);

    await submitCode(zoe, 'ZZZZZ2');
    await expect(codeError(zoe)).toHaveText(fr.RoomAccess.errors.unknown);
    await expect(codeField(zoe)).toBeFocused();
    await expect(codeField(zoe)).toHaveAttribute('aria-invalid', 'true');
    await expect(codeField(zoe)).toHaveAccessibleDescription(`${fr.RoomAccess.joinHint} ${fr.RoomAccess.errors.unknown}`);
    await expectEveryVisibleStringFromCatalog(zoe, [zoeName, 'ZZZZZ2']);
    await expectNoAccessibilityViolations(zoe);

    await submitCode(zoe, started.code);
    await expect(codeError(zoe)).toHaveText(fr.RoomAccess.errors['race-started']);
    await submitCode(zoe, full.code);
    await expect(codeError(zoe)).toHaveText(fr.RoomAccess.errors.full);
    await expect(zoe).toHaveURL('/play');
    await zoe.context().close();
    await maxPage.context().close();
  });

  test('after 10 wrong codes within a minute, Zoe is told to wait a minute, even with the right code', async ({ browser, page }) => {
    const { code } = await openUnlistedRoom(page, uniqueName('Alex '));
    const zoeName = uniqueName('Zoé ');
    const zoe = await guestAt(browser, zoeName, '/play/race');
    await insertRoomCodeFailures(await guestIdNamed(zoeName), gameConfig.rooms.codeThrottle.maxFailures);

    await submitCode(zoe, code);

    await expect(codeError(zoe)).toHaveText(fr.RoomAccess.errors.throttled);
    await expect(zoe).toHaveURL('/play/race');
    await zoe.context().close();
  });
});

test.describe('switching the visibility in the lobby', () => {
  test('Alex switches his room to "Publique": Zoe sees it live and has no switch of her own', async ({ browser, page }) => {
    const { roomId, code } = await openUnlistedRoom(page, uniqueName('Alex '));
    const zoe = await guestAt(browser, uniqueName('Zoé '), '/play');
    await submitCode(zoe, code);
    await expect(zoe).toHaveURL(roomPagePath(roomId));
    await expect(zoe.getByText(fr.RoomAccess.unlisted, { exact: true })).toBeVisible();
    await expect(visibilityGroup(zoe)).toHaveCount(0);

    await chooseVisibility(page, fr.RoomAccess.public);

    await expect(zoe.getByText(fr.RoomAccess.public, { exact: true })).toBeVisible({ timeout: liveUpdateMs });
    await expect.poll(async () => (await readRoomAccess(roomId)).visibility).toBe('public');
    await expect(visibilityRadio(page, fr.RoomAccess.public)).toBeChecked();
    await expect(playerRows(page)).toHaveCount(2);
    await zoe.context().close();
  });
});

test.describe('the visibility endpoint', () => {
  const post = (page: Page, roomId: string, data: string, contentType = 'application/json') =>
    page.request.post(`/api/rooms/${roomId}/visibility`, { headers: { 'Content-Type': contentType, Origin: new URL(page.url()).origin }, data });

  test('refuses a member who is not the host, a malformed body and a form post, and changes nothing', async ({ browser, page }) => {
    const { roomId, code } = await openUnlistedRoom(page, uniqueName('Alex '));
    const zoe = await guestAt(browser, uniqueName('Zoé '), '/play');
    await submitCode(zoe, code);
    await expect(zoe).toHaveURL(roomPagePath(roomId));

    expect((await post(zoe, roomId, '{"visibility":"public"}')).status()).toBe(403);
    expect((await post(page, roomId, '{"visibility":"private"}')).status()).toBe(400);
    expect((await post(page, roomId, 'x'.repeat(gameConfig.rooms.maxVisibilityBodyBytes + 1))).status()).toBe(413);
    expect((await post(page, roomId, 'visibility=public', 'application/x-www-form-urlencoded')).status()).toBe(415);
    expect((await readRoomAccess(roomId)).visibility).toBe('unlisted');

    expect((await post(page, roomId, '{"visibility":"public"}')).status()).toBe(200);
    expect((await readRoomAccess(roomId)).visibility).toBe('public');
    await zoe.context().close();
  });
});

for (const scheme of ['light', 'dark'] satisfies ColorScheme[]) {
  test(`the code and the chosen visibility use the ${scheme} theme tokens`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();
    await openUnlistedRoom(page, uniqueName('Alex '));
    const palette = themeColors(scheme);

    const codeColors = await roomCode(page).evaluate((element) => ({ background: getComputedStyle(element).backgroundColor, text: getComputedStyle(element).color }));
    const chosen = page.locator('.visibility-option[data-state="current"] .visibility-face');
    const chosenColors = await chosen.evaluate((element) => ({ background: getComputedStyle(element).backgroundColor, text: getComputedStyle(element).color }));

    expect(sameColor(parseCssColor(codeColors.background), palette.get('cream-deep')!)).toBe(true);
    expect(sameColor(parseCssColor(codeColors.text), palette.get('ink')!)).toBe(true);
    expect(sameColor(parseCssColor(chosenColors.background), palette.get('gold')!)).toBe(true);
    expect(sameColor(parseCssColor(chosenColors.text), palette.get('on-gold')!)).toBe(true);
    await expectNoAccessibilityViolations(page);
    await context.close();
  });
}
