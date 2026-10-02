import { randomUUID } from 'node:crypto';
import { expect, test, type APIResponse, type Page } from '@playwright/test';
import { insertSession, sessionCookieName, uniqueName } from './support/guests';
import { countMembersOf, newGuestPage, openRoomAsNewGuest, readRoomPhase, readRoomRevision, roomPagePath } from './support/rooms';

const commands = ['leave', 'abandon'] as const;

type RequestOptions = { origin?: string | null; contentType?: string | null; cookie?: string; data?: string; fetchSite?: string };

function post(page: Page, path: string, options: RequestOptions = {}): Promise<APIResponse> {
  const { origin = new URL(page.url()).origin, contentType = 'application/json', cookie, data = '{}', fetchSite } = options;
  const headers: Record<string, string> = {};
  if (origin) headers.origin = origin;
  if (contentType) headers['content-type'] = contentType;
  if (cookie !== undefined) headers.cookie = cookie;
  if (fetchSite) headers['sec-fetch-site'] = fetchSite;
  return page.request.post(path, { headers, data });
}

async function expectEmptyRefusal(response: APIResponse, status: number): Promise<void> {
  expect(response.status()).toBe(status);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.body()).toHaveLength(0);
}

test.describe('the leave and abandon endpoints', () => {
  for (const command of commands) {
    test(`${command}: refuses a missing session, a cross-site origin, a non-JSON body and an unknown room, changing nothing`, async ({ page }) => {
      const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
      const revisionBefore = await readRoomRevision(roomId);
      const path = `/api/rooms/${roomId}/${command}`;

      await expectEmptyRefusal(await post(page, path, { cookie: '' }), 401);
      await expectEmptyRefusal(await post(page, path, { cookie: `${sessionCookieName}=not-a-token` }), 401);
      expect((await post(page, path, { origin: 'https://evil.example', fetchSite: 'cross-site' })).status()).toBe(403);
      expect((await post(page, path, { origin: null })).status()).toBe(403);
      await expectEmptyRefusal(await post(page, path, { contentType: 'text/plain' }), 415);
      await expectEmptyRefusal(await post(page, `/api/rooms/${randomUUID()}/${command}`), 404);
      await expectEmptyRefusal(await post(page, `/api/rooms/not-a-room/${command}`), 404);
      expect((await page.request.get(path)).status()).toBe(405);
      expect(await readRoomPhase(roomId)).toBe('waiting');
      expect(await readRoomRevision(roomId)).toBe(revisionBefore);
      expect(await countMembersOf(roomId)).toBe(1);
    });

    test(`${command}: a guest who is not in the room is refused with 403 and nothing changes`, async ({ browser, page }) => {
      const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
      const revisionBefore = await readRoomRevision(roomId);
      const ninaPage = await newGuestPage(browser, uniqueName('Nina '));

      await expectEmptyRefusal(await post(ninaPage, `/api/rooms/${roomId}/${command}`), 403);
      expect(await readRoomPhase(roomId)).toBe('waiting');
      expect(await readRoomRevision(roomId)).toBe(revisionBefore);
      expect(await countMembersOf(roomId)).toBe(1);
      await ninaPage.context().close();
    });
  }

  test('a leave request from Nina that names Zoe removes only Nina: the player is the session, never the body', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    await zoePage.goto(roomPagePath(roomId));
    const ninaPage = await newGuestPage(browser, uniqueName('Nina '));
    await ninaPage.goto(roomPagePath(roomId));
    expect(await countMembersOf(roomId)).toBe(3);
    const body = JSON.stringify({ guestId: randomUUID(), trainerName: 'Zoé', memberKey: randomUUID() });

    const response = await post(ninaPage, `/api/rooms/${roomId}/leave`, { data: body });

    expect(response.status()).toBe(200);
    expect(await countMembersOf(roomId)).toBe(2);
    expect(await readRoomPhase(roomId)).toBe('waiting');
    await expect(zoePage.getByRole('button', { name: /./ }).first()).toBeVisible();
    await zoePage.context().close();
    await ninaPage.context().close();
  });

  test('a member abandoning a waiting room gets 409 and stays in it', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));

    await expectEmptyRefusal(await post(page, `/api/rooms/${roomId}/abandon`), 409);
    expect(await countMembersOf(roomId)).toBe(1);
  });
});

test.describe('expired sessions', () => {
  test('answer 401 to leave', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const token = randomUUID();
    await insertSession(token, uniqueName('Old '), new Date(Date.now() - 60_000));
    await expectEmptyRefusal(await post(page, `/api/rooms/${roomId}/leave`, { cookie: `${sessionCookieName}=${token}` }), 401);
  });
});
