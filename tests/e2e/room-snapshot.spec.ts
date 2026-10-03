import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';
import { createSessionToken } from '../../src/server/sessions/session-token';
import { insertSession, readSessionToken, sessionCookieName, uniqueName, withTestDatabase } from './support/guests';
import { createRoom, newGuestPage, openRoomAsNewGuest, progressPath, readRoomRaces, readRoomRevision, setRoomPhase, snapshotPath, startRaceInDatabase } from './support/rooms';
import { finishRaceInDatabase, readSettledRace } from './support/settlement';

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
        { trainerName: alex, hasAccount: false, isHost: true, isViewer: false },
        { trainerName: zoe, hasAccount: false, isHost: false, isViewer: true },
      ],
    });
    await zoePage.context().close();
  });

  test('a waiting room has no race, and every answer carries the server time', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const before = Date.now();
    const body = await (await page.request.get(snapshotPath(roomId))).json();

    expect(body.race).toBeNull();
    expect(body.serverNow).toBeGreaterThanOrEqual(before - 1_000);
    expect(body.serverNow).toBeLessThanOrEqual(Date.now() + 1_000);
  });

  test('once the race is started a member gets its start time and passage, still without any guest id', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    await zoePage.goto(`/rooms/${roomId}`);
    await startRaceInDatabase(roomId, 3_000);
    const [race] = await readRoomRaces(roomId);

    const body = await (await zoePage.request.get(snapshotPath(roomId))).text();
    for (const guestId of await readGuestIds(roomId)) expect(body).not.toContain(guestId);
    expect(JSON.parse(body)).toMatchObject({ phase: 'countdown', race: { startsAt: race!.startsAt.getTime(), passage: race!.passage } });
    await zoePage.context().close();
  });

  test('during a race every member carries a position and finish time, and only the viewer gets its own counters', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const zoe = uniqueName('Zoé ');
    const roomId = await openRoomAsNewGuest(page, alex);
    const zoePage = await newGuestPage(browser, zoe);
    await zoePage.goto(`/rooms/${roomId}`);
    await startRaceInDatabase(roomId, -10_000);
    const report = { sequence: 1, position: 3, keystrokes: 5, rejectedKeystrokes: 2 };
    const origin = new URL(zoePage.url()).origin;
    expect((await zoePage.request.post(progressPath(roomId), { headers: { origin, 'content-type': 'application/json' }, data: JSON.stringify(report) })).status()).toBe(200);

    const alexView = await (await page.request.get(snapshotPath(roomId))).json();
    expect(alexView.members).toMatchObject([
      { trainerName: alex, progress: { position: 0, finishMs: null } },
      { trainerName: zoe, progress: { position: 3, finishMs: null } },
    ]);
    expect(alexView.race.viewer).toEqual({ lastSequence: 0, position: 0, keystrokes: 0, rejectedKeystrokes: 0 });
    const zoeView = await (await zoePage.request.get(snapshotPath(roomId))).json();
    expect(zoeView.race.viewer).toEqual({ lastSequence: 1, position: 3, keystrokes: 5, rejectedKeystrokes: 2 });
    await zoePage.context().close();
  });

  test('a race has no results until it settles; then every member gets the same frozen results, keyed by member, without any guest id', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const zoe = uniqueName('Zoé ');
    const roomId = await openRoomAsNewGuest(page, alex);
    const zoePage = await newGuestPage(browser, zoe);
    await zoePage.goto(`/rooms/${roomId}`);
    await startRaceInDatabase(roomId, -60_000);
    expect((await (await page.request.get(snapshotPath(roomId))).json()).race.results).toBeNull();

    await finishRaceInDatabase(roomId, [
      { trainerName: alex, elapsedMs: 30_000, rejectedKeystrokes: 0 },
      { trainerName: zoe, elapsedMs: 40_000, rejectedKeystrokes: 3 },
    ]);
    const alexBody = await (await page.request.get(snapshotPath(roomId))).text();
    const zoeBody = await (await zoePage.request.get(snapshotPath(roomId))).text();
    for (const guestId of await readGuestIds(roomId)) expect(alexBody + zoeBody).not.toContain(guestId);
    const [alexView, zoeView] = [JSON.parse(alexBody), JSON.parse(zoeBody)];
    expect(alexView.phase).toBe('results');
    expect(zoeView.race.results).toEqual(alexView.race.results);
    const keyOf = (name: string) => alexView.members.find((member: { trainerName: string }) => member.trainerName === name).memberKey;
    const settled = await readSettledRace(roomId);
    const resultFor = (name: string) => settled.results.find((result) => result.trainerName === name)!;
    expect(alexView.race.results).toEqual(
      expect.arrayContaining(
        [alex, zoe].map((name) => {
          const { place, grossWpm, score, accuracy, rejectedKeystrokes, finishMs } = resultFor(name);
          return { memberKey: keyOf(name), standing: 'ranked', place, grossWpm, score, accuracy, errors: rejectedKeystrokes, finishMs };
        }),
      ),
    );
    expect(alexView.race.results).toHaveLength(2);
    await zoePage.context().close();
  });

  test('a waiting room member has no progress', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const body = await (await page.request.get(snapshotPath(roomId))).json();

    expect(body.members[0].progress).toBeNull();
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
