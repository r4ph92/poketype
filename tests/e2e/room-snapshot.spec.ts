import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';
import { createSessionToken } from '../../src/server/sessions/session-token';
import { insertSession, readSessionToken, sessionCookieName, uniqueName, withTestDatabase } from './support/guests';
import { createRoom, newGuestPage, openRoomAsNewGuest, readRoomRevision, setRoomPhase, snapshotPath } from './support/rooms';

async function readGuestIds(roomId: string): Promise<string[]> {
  return withTestDatabase(async (sql) => {
    const rows = await sql`select guest_id from room_members where room_id = ${roomId}`;
    return rows.map((row) => row.guest_id as string);
  });
}

function getWithCookie(request: APIRequestContext, path: string, cookie: string | null): Promise<APIResponse> {
  return request.get(path, { headers: cookie ? { cookie } : {} });
}

async function expectEmptyRefusal(response: APIResponse, status: number): Promise<void> {
  expect(response.status()).toBe(status);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.body()).toHaveLength(0);
}

test.describe('the room snapshot endpoint', () => {
  test('gives a member the revisioned snapshot, uncached, without any guest id', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const zoe = uniqueName('Zoé ');
    const roomId = await openRoomAsNewGuest(page, alex);
    const zoePage = await newGuestPage(browser, zoe);
    await zoePage.goto(`/rooms/${roomId}`);

    const response = await zoePage.request.get(snapshotPath(roomId));
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('no-store');
    const body = await response.text();
    for (const guestId of await readGuestIds(roomId)) expect(body).not.toContain(guestId);
    expect(JSON.parse(body)).toMatchObject({
      roomId,
      phase: 'waiting',
      revision: await readRoomRevision(roomId),
      members: [
        { trainerName: alex, isHost: true, isViewer: false },
        { trainerName: zoe, isHost: false, isViewer: true },
      ],
    });
    await zoePage.context().close();
  });

  test('never joins: a guest who never opened the room gets the empty 403', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const revisionBefore = await readRoomRevision(roomId);
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));

    await expectEmptyRefusal(await zoePage.request.get(snapshotPath(roomId)), 403);
    expect((await readGuestIds(roomId)).length).toBe(1);
    expect(await readRoomRevision(roomId)).toBe(revisionBefore);
    await zoePage.context().close();
  });

  test('answers the same empty 404 for unknown, malformed, uppercase and closed rooms', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    await page.goto('/play');
    const closedRoomId = await createRoom(page);
    await setRoomPhase(closedRoomId, 'closed');

    for (const id of [randomUUID(), 'not-a-uuid', roomId.toUpperCase(), closedRoomId, '%E0%A4%A']) {
      await expectEmptyRefusal(await page.request.get(snapshotPath(id)), 404);
    }
  });

  test('answers an undecodable room id with the empty 404, not a server error', async ({ page }) => {
    await openRoomAsNewGuest(page, uniqueName('Alex '));
    await expectEmptyRefusal(await page.request.get('/api/rooms/%/snapshot'), 404);
  });

  test('answers an empty 401 to a missing, malformed or expired session, even for a real room', async ({ page, request }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const expiredToken = createSessionToken();
    await insertSession(expiredToken, uniqueName('Old '), new Date(Date.now() - 60_000));

    for (const cookie of [null, `${sessionCookieName}=not-a-token`, `${sessionCookieName}=${expiredToken}`]) {
      await expectEmptyRefusal(await getWithCookie(request, snapshotPath(roomId), cookie), 401);
    }
    const validCookie = `${sessionCookieName}=${await readSessionToken(page.context())}`;
    expect((await getWithCookie(request, snapshotPath(roomId), validCookie)).status()).toBe(200);
  });

  test('accepts only GET: other methods are refused and change nothing', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const revisionBefore = await readRoomRevision(roomId);
    const origin = new URL(page.url()).origin;
    const path = snapshotPath(roomId);

    expect((await page.request.post(path, { headers: { origin } })).status()).toBe(405);
    expect((await page.request.post(path)).status()).toBe(403);
    expect((await page.request.put(path, { headers: { origin } })).status()).toBe(405);
    expect((await page.request.delete(path, { headers: { origin } })).status()).toBe(405);
    expect(await readRoomRevision(roomId)).toBe(revisionBefore);
  });
});
