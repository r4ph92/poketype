import { expect, test, type Browser, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { gameConfig } from '../../src/config/game';
import { enterAsGuest, uniqueName } from './support/guests';
import { countMembersOf, createRoom, newGuestPage, readRoomCode, uniqueTestAddress } from './support/rooms';

const { maxFailures } = gameConfig.rooms.codeThrottle;
const codeNoRoomHas = 'ZZZZZ2';
const codeField = (page: Page) => page.getByLabel(fr.RoomAccess.joinLabel);
const codeError = (page: Page) => page.locator('form').filter({ has: codeField(page) }).getByRole('alert');

// x-real-ip stands in for the address the hosting proxy reports; the proxy overwrites any value a client sends.
function guestOnAddress(browser: Browser, address: string): Promise<Page> {
  return newGuestPage(browser, uniqueName('Zoé '), (context) => context.setExtraHTTPHeaders({ 'x-real-ip': address }));
}

async function submitCode(page: Page, typed: string): Promise<void> {
  await codeField(page).fill(typed);
  await page.getByRole('button', { name: fr.RoomAccess.joinSubmit }).click();
}

async function guessWithForgedForwardedFor(page: Page, address: string, guess: number): Promise<void> {
  await page.context().setExtraHTTPHeaders({ 'x-real-ip': address, 'x-forwarded-for': `203.0.113.${guess + 1}` });
  await submitCode(page, codeNoRoomHas);
  await expect(codeError(page)).toHaveText(fr.RoomAccess.errors.unknown);
}

test('10 wrong codes from one address lock a new guest on that address, not a player elsewhere', async ({ browser, page }) => {
  await enterAsGuest(page, uniqueName('Alex '));
  const roomId = await createRoom(page, 'unlisted');
  const code = await readRoomCode(roomId);
  const sharedAddress = uniqueTestAddress();

  const zoe = await guestOnAddress(browser, sharedAddress);
  for (let guess = 0; guess < maxFailures; guess += 1) await guessWithForgedForwardedFor(zoe, sharedAddress, guess);

  const nina = await guestOnAddress(browser, sharedAddress);
  await submitCode(nina, code);
  await expect(codeError(nina)).toHaveText(fr.RoomAccess.errors.throttled);
  expect(await countMembersOf(roomId)).toBe(1);

  const max = await guestOnAddress(browser, uniqueTestAddress());
  await submitCode(max, code);
  await expect(max).toHaveURL(new RegExp(roomId));
  expect(await countMembersOf(roomId)).toBe(2);

  await Promise.all([zoe, nina, max].map((guest) => guest.context().close()));
});
