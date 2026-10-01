import { randomUUID } from 'node:crypto';
import { expect, test, type APIResponse, type Page } from '@playwright/test';
import { createSessionToken } from '../../src/server/sessions/session-token';
import { insertSession, sessionCookieName, uniqueName } from './support/guests';
import {
  countMembersOf,
  createRoom,
  newGuestPage,
  openRoomAsNewGuest,
  readRoomPhase,
  readRoomRaces,
  readRoomRevision,
  roomPagePath,
  setRoomPhase,
  startPath,
} from './support/rooms';

type StartRequestOptions = { origin?: string | null; contentType?: string | null; cookie?: string; fetchSite?: string };

function postStart(page: Page, roomIdOrPath: string, options: StartRequestOptions = {}): Promise<APIResponse> {
  const { origin = new URL(page.url()).origin, contentType = 'application/json', cookie, fetchSite } = options;
  const headers: Record<string, string> = {};
  if (origin) headers.origin = origin;
  if (contentType) headers['content-type'] = contentType;
  if (cookie !== undefined) headers.cookie = cookie;
  if (fetchSite) headers['sec-fetch-site'] = fetchSite;
  const path = roomIdOrPath.startsWith('/') ? roomIdOrPath : startPath(roomIdOrPath);
  return page.request.post(path, { headers, data: '{}' });
}

async function expectEmptyRefusal(response: APIResponse, status: number): Promise<void> {
  expect(response.status()).toBe(status);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.body()).toHaveLength(0);
}

async function expectUntouched(roomId: string, revisionBefore: number): Promise<void> {
  expect(await readRoomPhase(roomId)).toBe('waiting');
  expect(await readRoomRaces(roomId)).toHaveLength(0);
  expect(await readRoomRevision(roomId)).toBe(revisionBefore);
}

async function openRoomWithZoe(page: Page, zoePage: Page): Promise<string> {
  const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
  await zoePage.goto(roomPagePath(roomId));
  return roomId;
}

test.describe('the start race endpoint', () => {
  test('the host starts the race once: 201 then 200 already-started, one race row, uncached', async ({ browser, page }) => {
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    const roomId = await openRoomWithZoe(page, zoePage);

    const first = await postStart(page, roomId);
    expect(first.status()).toBe(201);
    expect(first.headers()['cache-control']).toBe('no-store');
    expect(await first.json()).toEqual({ result: 'started' });
    const second = await postStart(page, roomId);
    expect(second.status()).toBe(200);
    expect(await second.json()).toEqual({ result: 'already-started' });
    expect(await readRoomRaces(roomId)).toHaveLength(1);
    await zoePage.context().close();
  });

  test('a start request from a lone host answers 409 and the room stays waiting', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const revisionBefore = await readRoomRevision(roomId);

    await expectEmptyRefusal(await postStart(page, roomId), 409);
    await expectUntouched(roomId, revisionBefore);
  });

  test("Zoe's direct start request answers 403, with the revision unchanged and no race", async ({ browser, page }) => {
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    const roomId = await openRoomWithZoe(page, zoePage);
    const revisionBefore = await readRoomRevision(roomId);

    await expectEmptyRefusal(await postStart(zoePage, roomId), 403);
    await expectUntouched(roomId, revisionBefore);
    await zoePage.context().close();
  });

  test('a guest who never opened the room gets 403 and is not added', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const revisionBefore = await readRoomRevision(roomId);
    const ninaPage = await newGuestPage(browser, uniqueName('Nina '));

    await expectEmptyRefusal(await postStart(ninaPage, roomId), 403);
    await expectUntouched(roomId, revisionBefore);
    expect(await countMembersOf(roomId)).toBe(1);
    await ninaPage.context().close();
  });

  test('answers an empty 401 to a missing, malformed or expired session', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const expiredToken = createSessionToken();
    await insertSession(expiredToken, uniqueName('Old '), new Date(Date.now() - 60_000));

    for (const cookie of ['', `${sessionCookieName}=not-a-token`, `${sessionCookieName}=${expiredToken}`]) {
      await expectEmptyRefusal(await postStart(page, roomId, { cookie }), 401);
    }
  });

  test('answers the same empty 404 for unknown, malformed, uppercase, closed and undecodable rooms', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    await page.goto('/play');
    const closedRoomId = await createRoom(page);
    await setRoomPhase(closedRoomId, 'closed');

    for (const id of [randomUUID(), 'not-a-uuid', roomId.toUpperCase(), closedRoomId]) {
      await expectEmptyRefusal(await postStart(page, id), 404);
    }
    await expectEmptyRefusal(await postStart(page, '/api/rooms/%/start'), 404);
  });

  test('refuses a request without a trusted Origin or without JSON, and changes nothing', async ({ browser, page }) => {
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    const roomId = await openRoomWithZoe(page, zoePage);
    const revisionBefore = await readRoomRevision(roomId);

    expect((await postStart(page, roomId, { origin: null })).status()).toBe(403);
    expect((await postStart(page, roomId, { origin: 'https://evil.example', fetchSite: 'cross-site' })).status()).toBe(403);
    await expectEmptyRefusal(await postStart(page, roomId, { contentType: null }), 415);
    await expectEmptyRefusal(await postStart(page, roomId, { contentType: 'text/plain' }), 415);
    await expectEmptyRefusal(await postStart(page, roomId, { contentType: 'application/x-www-form-urlencoded' }), 415);
    await expectUntouched(roomId, revisionBefore);
    await zoePage.context().close();
  });

  test('accepts only POST: other methods answer 405 and change nothing', async ({ browser, page }) => {
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    const roomId = await openRoomWithZoe(page, zoePage);
    const revisionBefore = await readRoomRevision(roomId);
    const origin = new URL(page.url()).origin;
    const path = startPath(roomId);

    expect((await page.request.get(path)).status()).toBe(405);
    expect((await page.request.put(path, { headers: { origin } })).status()).toBe(405);
    expect((await page.request.delete(path, { headers: { origin } })).status()).toBe(405);
    await expectUntouched(roomId, revisionBefore);
    await zoePage.context().close();
  });
});
