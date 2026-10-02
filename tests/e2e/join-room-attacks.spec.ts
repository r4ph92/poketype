import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { uniqueName } from './support/guests';
import { countMembersOf, openRoomAsNewGuest, redirectTarget, setRoomPhase } from './support/rooms';
import { headersWithout, type CapturedSubmission } from './support/submissions';
import { chooseStarterOnScreen } from './support/trainer';
import type { RoomId } from '../../src/domain/room-id';
import { chooseStarterPath, hubDestination } from '../../src/domain/starter-destination';

const returnField = (page: Page) => page.locator('input[name="returnRoomId"]');

async function enterFromAddress(page: Page, address: string, trainerName: string): Promise<void> {
  await page.goto(address);
  await page.getByLabel(fr.GuestEntry.label).fill(trainerName);
  await page.getByRole('button', { name: fr.GuestEntry.submit }).click();
}

async function captureInvitedEntry(page: Page, roomId: string): Promise<CapturedSubmission> {
  const captured = new Promise<CapturedSubmission>((resolve) => {
    void page.route(
      (url) => url.pathname === '/',
      async (route) => {
        const request = route.request();
        if (request.method() !== 'POST') return route.continue();
        resolve({ headers: headersWithout(request.headers(), ['content-length']), body: request.postDataBuffer()! });
        return route.abort();
      },
    );
  });
  await enterFromAddress(page, `/?room=${roomId}`, uniqueName('Zoé '));
  return captured;
}

async function replayWithReturnRoom(request: APIRequestContext, captured: CapturedSubmission, roomId: string, returnRoomId: string) {
  const body = Buffer.from(captured.body.toString('utf8').replaceAll(roomId, returnRoomId), 'utf8');
  return request.post(`/?room=${roomId}`, { headers: captured.headers, data: body, maxRedirects: 0 });
}

test.describe('the invitation return address', () => {
  const tamperedAddresses: [string, (roomId: string) => string][] = [
    ['an absolute url', () => 'https://evil.example'],
    ['a protocol-relative url', () => '//evil.example'],
    ['a path around the room', (roomId) => `/rooms/${roomId}/../x`],
    ['an uppercase room id', (roomId) => roomId.toUpperCase()],
    ['a script url', () => 'javascript:alert(1)'],
  ];

  for (const [label, tamper] of tamperedAddresses) {
    test(`${label} shows no invitation and leads to the play page`, async ({ browser, page }) => {
      const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
      const visitor = await (await browser.newContext()).newPage();
      const address = `/?room=${encodeURIComponent(tamper(roomId))}`;

      await visitor.goto(address);
      await expect(visitor.getByText(fr.Home.joinRoomHint)).toHaveCount(0);
      await expect(returnField(visitor)).toHaveCount(0);
      await enterFromAddress(visitor, address, uniqueName('Zoé '));
      await chooseStarterOnScreen(visitor);
      await expect(visitor).toHaveURL('/play');
      expect(await countMembersOf(roomId)).toBe(1);
      await visitor.context().close();
    });
  }

  test('a repeated room parameter shows no invitation and no hidden field', async ({ page }) => {
    const roomId = randomUUID();
    await page.goto(`/?room=${roomId}&room=${roomId}`);
    await expect(page.getByLabel(fr.GuestEntry.label)).toBeVisible();
    await expect(page.getByText(fr.Home.joinRoomHint)).toHaveCount(0);
    await expect(returnField(page)).toHaveCount(0);
  });

  test('a valid room parameter carries exactly that id in the hidden field', async ({ page }) => {
    const roomId = randomUUID();
    await page.goto(`/?room=${roomId}`);
    await expect(returnField(page)).toHaveValue(roomId);
  });

  test('a replayed entry with a tampered return room never redirects off the site or outside a room', async ({ page, request }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const visitor = await page.context().browser()!.newContext();
    const captured = await captureInvitedEntry(await visitor.newPage(), roomId);

    for (const tampered of ['https://evil.example/x', '//evil.example/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', roomId.toUpperCase()]) {
      const response = await replayWithReturnRoom(request, captured, roomId, tampered);
      expect(redirectTarget(response)).toBe(chooseStarterPath(hubDestination));
    }
    const control = await replayWithReturnRoom(request, captured, roomId, roomId);
    expect(redirectTarget(control)).toBe(chooseStarterPath({ kind: 'room', roomId: roomId as RoomId }));
    await visitor.close();
  });
});

test.describe('opening a room link without a guest session', () => {
  test('never adds anyone, as for a link preview bot', async ({ page, request }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const response = await request.get(`/rooms/${roomId}`, { maxRedirects: 0 });
    expect(response.headers()['location']).toBe(`/?room=${roomId}`);
    expect(await countMembersOf(roomId)).toBe(1);
  });

  test('answers the room 404 for a closed room and an unknown room', async ({ page, request }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    await setRoomPhase(roomId, 'closed');
    for (const id of [roomId, randomUUID()]) {
      expect((await request.get(`/rooms/${id}`, { maxRedirects: 0 })).status()).toBe(404);
    }
  });
});
