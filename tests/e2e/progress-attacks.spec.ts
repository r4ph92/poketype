import { randomUUID } from 'node:crypto';
import { expect, test, type APIResponse, type Browser, type Page } from '@playwright/test';
import { gameConfig } from '../../src/config/game';
import { passageLength } from '../../src/domain/passage';
import { createSessionToken } from '../../src/server/sessions/session-token';
import { insertSession, readSessionToken, sessionCookieName, uniqueName, withTestDatabase } from './support/guests';
import { installRaceHarness, readRosterChanges } from './support/race';
import {
  createRoom,
  newGuestPage,
  openRoomAsNewGuest,
  progressPath,
  readParticipants,
  readRoomRaces,
  readRoomRevision,
  roomPagePath,
  setRoomPhase,
  startRaceInDatabase,
  testPassage,
  type StoredParticipant,
} from './support/rooms';
import { expectedResultCells, readResultCells, resultsTable } from './support/results';
import { readSettledRace } from './support/settlement';
import { percentText, racerRow } from './support/typing';

type ProgressRequestOptions = { origin?: string | null; contentType?: string | null; cookie?: string };

type RaceOfTwo = { alexPage: Page; zoePage: Page; roomId: string; zoe: string };

const fullLength = passageLength(testPassage);
// The cumulative speed cap lets the whole passage through about 2.7 s after the start; the race started 1 s before.
const honestFinishWaitMs = 2_500;
const untouched = { lastSequence: 0, position: 0, keystrokes: 0, rejectedKeystrokes: 0, finishMs: null };

function postProgress(page: Page, roomIdOrPath: string, body: unknown, options: ProgressRequestOptions = {}): Promise<APIResponse> {
  const { origin = new URL(page.url()).origin, contentType = 'application/json', cookie } = options;
  const headers: Record<string, string> = {};
  if (origin) headers.origin = origin;
  if (contentType) headers['content-type'] = contentType;
  if (cookie !== undefined) headers.cookie = cookie;
  const path = roomIdOrPath.startsWith('/') ? roomIdOrPath : progressPath(roomIdOrPath);
  return page.request.post(path, { headers, data: typeof body === 'string' ? body : JSON.stringify(body) });
}

async function raceOfTwo(browser: Browser, page: Page, startsInMs = -60_000): Promise<RaceOfTwo> {
  const zoe = uniqueName('Zoé ');
  await installRaceHarness(page.context());
  const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
  const zoePage = await newGuestPage(browser, zoe);
  await zoePage.goto(roomPagePath(roomId));
  await startRaceInDatabase(roomId, startsInMs);
  return { alexPage: page, zoePage, roomId, zoe };
}

async function expectEmptyRefusal(response: APIResponse, status: number): Promise<void> {
  expect(response.status()).toBe(status);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.body()).toHaveLength(0);
}

async function expectRefusalWithStoredRow(response: APIResponse, status: number, result: string, stored: object): Promise<void> {
  expect(response.status()).toBe(status);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.json()).toEqual({ result, ...stored });
}

async function snapshotOfParticipants(roomId: string): Promise<{ participants: StoredParticipant[]; revision: number }> {
  return { participants: await readParticipants(roomId), revision: await readRoomRevision(roomId) };
}

test.describe('the progress endpoint', () => {
  test('accepts a consistent report from a participant and answers the stored row, uncached', async ({ browser, page }) => {
    const { zoePage, roomId } = await raceOfTwo(browser, page);

    const response = await postProgress(zoePage, roomId, { sequence: 1, position: 4, keystrokes: 5, rejectedKeystrokes: 1 });
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('no-store');
    expect(await response.json()).toEqual({ result: 'accepted', lastSequence: 1, position: 4, keystrokes: 5, rejectedKeystrokes: 1, finishMs: null });
    await zoePage.context().close();
  });

  test('refuses a position beyond the passage or above the correct keystrokes with 422, the stored row, and no change', async ({ browser, page }) => {
    const { zoePage, roomId } = await raceOfTwo(browser, page);
    const before = await snapshotOfParticipants(roomId);

    const beyond = { sequence: 1, position: fullLength + 1, keystrokes: fullLength + 1, rejectedKeystrokes: 0 };
    await expectRefusalWithStoredRow(await postProgress(zoePage, roomId, beyond), 422, 'implausible', untouched);
    const aboveCorrect = { sequence: 1, position: 40, keystrokes: 3, rejectedKeystrokes: 0 };
    await expectRefusalWithStoredRow(await postProgress(zoePage, roomId, aboveCorrect), 422, 'implausible', untouched);
    expect(await snapshotOfParticipants(roomId)).toEqual(before);
    await zoePage.context().close();
  });

  test("crafted reports are refused and Alex's page never shows them", async ({ browser, page }) => {
    const { alexPage, zoePage, roomId, zoe } = await raceOfTwo(browser, page);
    await expect(racerRow(alexPage, zoe)).toContainText(percentText(0));

    const crafted = [
      { sequence: 1, position: fullLength + 1, keystrokes: fullLength + 1, rejectedKeystrokes: 0 },
      { sequence: 2, position: 40, keystrokes: 3, rejectedKeystrokes: 0 },
      { sequence: 3, position: fullLength, keystrokes: fullLength * 100, rejectedKeystrokes: fullLength * 99 },
    ];
    for (const body of crafted) expect((await postProgress(zoePage, roomId, body)).status()).toBe(422);
    await alexPage.waitForTimeout(1_500);

    const zoeRows = (await readRosterChanges(alexPage)).flatMap((change) => change.rows.filter((row) => row.startsWith(zoe)));
    expect(zoeRows.length).toBeGreaterThan(0);
    expect(zoeRows.every((row) => row === `${zoe}${percentText(0)}`)).toBe(true);
    expect((await readParticipants(roomId)).every((participant) => participant.lastSequence === 0)).toBe(true);
    await zoePage.context().close();
  });

  test('a crafted finish claiming 1 second or 200 WPM is ignored: the results show the server-measured time and values', async ({ browser, page }) => {
    const { alexPage, zoePage, roomId, zoe } = await raceOfTwo(browser, page, -1_000);
    const claims = { finishMs: 1_000, finishedAt: Date.now(), wpm: 200, grossWpm: 200, accuracy: 1 };
    const fullPassage = { position: fullLength, keystrokes: fullLength + 1, rejectedKeystrokes: 1 };

    await expectRefusalWithStoredRow(await postProgress(zoePage, roomId, { sequence: 1, ...fullPassage, ...claims }), 422, 'implausible', untouched);
    await zoePage.waitForTimeout(honestFinishWaitMs);
    expect((await postProgress(zoePage, roomId, { sequence: 2, ...fullPassage, ...claims })).status()).toBe(200);
    expect((await postProgress(alexPage, roomId, { sequence: 1, ...fullPassage })).status()).toBe(200);

    const { results } = await readSettledRace(roomId);
    const zoeResult = results.find((result) => result.trainerName === zoe)!;
    const zoeFinishedAt = (await readParticipants(roomId)).find((row) => row.guestId === zoeResult.guestId)!.finishedAt!;
    const measuredMs = zoeFinishedAt.getTime() - (await readRoomRaces(roomId))[0]!.startsAt.getTime();
    expect(zoeResult.finishMs).toBe(measuredMs);
    expect(zoeResult.finishMs).toBeGreaterThanOrEqual(honestFinishWaitMs);
    expect(zoeResult.grossWpm).toBeCloseTo(fullLength / 5 / (measuredMs / 60_000), 6);
    expect(zoeResult.accuracy).toBeCloseTo(fullLength / (fullLength + 1), 6);
    await expect(resultsTable(alexPage)).toBeVisible({ timeout: 2_000 });
    expect(await readResultCells(alexPage)).toEqual(expectedResultCells(results, 'fr'));
    await zoePage.context().close();
  });

  test('refuses a report before the start with 409 and the stored row', async ({ browser, page }) => {
    const { zoePage, roomId } = await raceOfTwo(browser, page, 30_000);

    await expectRefusalWithStoredRow(await postProgress(zoePage, roomId, { sequence: 1, position: 1, keystrokes: 1, rejectedKeystrokes: 0 }), 409, 'not-started', untouched);
    await zoePage.context().close();
  });

  test('refuses a replayed sequence with 409 stale and the stored row', async ({ browser, page }) => {
    const { zoePage, roomId } = await raceOfTwo(browser, page);
    const first = { sequence: 1, position: 2, keystrokes: 2, rejectedKeystrokes: 0 };
    await postProgress(zoePage, roomId, first);

    const stored = { lastSequence: 1, position: 2, keystrokes: 2, rejectedKeystrokes: 0, finishMs: null };
    await expectRefusalWithStoredRow(await postProgress(zoePage, roomId, first), 409, 'stale', stored);
    await zoePage.context().close();
  });

  test('answers an empty 429 to a report right after an accepted one', async ({ browser, page }) => {
    const { zoePage, roomId } = await raceOfTwo(browser, page);
    await withTestDatabase((sql) => sql`update race_participants set last_reported_at = now() + interval '10 seconds' where race_id = (select id from races where room_id = ${roomId})`);

    await expectEmptyRefusal(await postProgress(zoePage, roomId, { sequence: 1, position: 1, keystrokes: 1, rejectedKeystrokes: 0 }), 429);
    await zoePage.context().close();
  });

  test('answers an empty 400 to malformed bodies and changes nothing', async ({ browser, page }) => {
    const { zoePage, roomId } = await raceOfTwo(browser, page);
    const before = await snapshotOfParticipants(roomId);
    const valid = { sequence: 1, position: 1, keystrokes: 1, rejectedKeystrokes: 0 };

    for (const body of ['{', '', 'null', '[]', '"text"', { ...valid, position: -1 }, { ...valid, keystrokes: 1.5 }, { ...valid, position: '1' }, { sequence: 1 }, { ...valid, sequence: 0 }]) {
      await expectEmptyRefusal(await postProgress(zoePage, roomId, body), 400);
    }
    for (const huge of [2 ** 31, 2 ** 53]) {
      await expectEmptyRefusal(await postProgress(zoePage, roomId, { ...valid, keystrokes: huge }), 400);
      await expectEmptyRefusal(await postProgress(zoePage, roomId, { ...valid, sequence: huge }), 400);
    }
    expect(await snapshotOfParticipants(roomId)).toEqual(before);
    await zoePage.context().close();
  });

  test('answers an empty 413 to a body over the byte limit, with or without Content-Length', async ({ browser, page }) => {
    const { zoePage, roomId } = await raceOfTwo(browser, page);
    const padded = JSON.stringify({ sequence: 1, position: 1, keystrokes: 1, rejectedKeystrokes: 0, padding: 'x'.repeat(gameConfig.race.maxProgressBodyBytes) });

    await expectEmptyRefusal(await postProgress(zoePage, roomId, padded), 413);
    const origin = new URL(zoePage.url()).origin;
    const chunked = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let index = 0; index < 4; index += 1) controller.enqueue(new TextEncoder().encode(padded));
        controller.close();
      },
    });
    const response = await fetch(new URL(progressPath(roomId), origin), {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json', cookie: `${sessionCookieName}=${await readSessionToken(zoePage.context())}` },
      body: chunked,
      duplex: 'half',
    } as RequestInit);
    expect(response.status).toBe(413);
    expect((await response.arrayBuffer()).byteLength).toBe(0);
    expect((await readParticipants(roomId)).every((participant) => participant.lastSequence === 0)).toBe(true);
    await zoePage.context().close();
  });

  test('answers an empty 403 to a guest who is not a member, and adds nobody', async ({ browser, page }) => {
    const { zoePage, roomId } = await raceOfTwo(browser, page);
    const ninaPage = await newGuestPage(browser, uniqueName('Nina '));
    const before = await snapshotOfParticipants(roomId);

    await expectEmptyRefusal(await postProgress(ninaPage, roomId, { sequence: 1, position: 1, keystrokes: 1, rejectedKeystrokes: 0 }), 403);
    expect(await snapshotOfParticipants(roomId)).toEqual(before);
    await ninaPage.context().close();
    await zoePage.context().close();
  });

  test('answers an empty 401 to a missing, malformed or expired session', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const expiredToken = createSessionToken();
    await insertSession(expiredToken, uniqueName('Old '), new Date(Date.now() - 60_000));

    for (const cookie of ['', `${sessionCookieName}=not-a-token`, `${sessionCookieName}=${expiredToken}`]) {
      await expectEmptyRefusal(await postProgress(page, roomId, { sequence: 1, position: 0, keystrokes: 0, rejectedKeystrokes: 0 }, { cookie }), 401);
    }
  });

  test('answers the same empty 404 for unknown, malformed, uppercase, closed and undecodable rooms', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    await page.goto('/play');
    const closedRoomId = await createRoom(page);
    await setRoomPhase(closedRoomId, 'closed');
    const body = { sequence: 1, position: 0, keystrokes: 0, rejectedKeystrokes: 0 };

    for (const id of [randomUUID(), 'not-a-uuid', roomId.toUpperCase(), closedRoomId]) {
      await expectEmptyRefusal(await postProgress(page, id, body), 404);
    }
    await expectEmptyRefusal(await postProgress(page, '/api/rooms/%/progress', body), 404);
  });

  test('refuses a request without a trusted Origin or without JSON, and changes nothing', async ({ browser, page }) => {
    const { zoePage, roomId } = await raceOfTwo(browser, page);
    const before = await snapshotOfParticipants(roomId);
    const body = { sequence: 1, position: 1, keystrokes: 1, rejectedKeystrokes: 0 };

    expect((await postProgress(zoePage, roomId, body, { origin: null })).status()).toBe(403);
    await expectEmptyRefusal(await postProgress(zoePage, roomId, body, { contentType: null }), 415);
    await expectEmptyRefusal(await postProgress(zoePage, roomId, body, { contentType: 'text/plain' }), 415);
    expect(await snapshotOfParticipants(roomId)).toEqual(before);
    await zoePage.context().close();
  });

  test('accepts only POST: other methods answer 405', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const origin = new URL(page.url()).origin;

    expect((await page.request.get(progressPath(roomId))).status()).toBe(405);
    expect((await page.request.put(progressPath(roomId), { headers: { origin } })).status()).toBe(405);
  });
});
