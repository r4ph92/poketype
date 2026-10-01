import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { passageLength } from '../../src/domain/passage';
import { progressPercent } from '../../src/domain/typing-progress';
import { startAppServer, type AppServer } from './support/app-server';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { passageFragments, readRosterChanges, type RosterChange } from './support/race';
import { PushSocketCutter, recordContextFrames, recordPageFrames, revisionPingsIn, subscriptionCount, type PushFrame } from './support/push';
import { expectedResultCells, readResultCells, resultsTable } from './support/results';
import { testPassage } from './support/rooms';
import { readSettledRace } from './support/settlement';
import { percentText, racerRow, startTwoPlayerRace } from './support/typing';

type ProgressAt = { percent: number; at: number };

const childTypingDelayMs = 150;
const pushLatencyBoundMs = 500;
const catchUpBoundMs = 2_000;
const dropMs = 10_000;
const fullLength = passageLength(testPassage);
const percentPattern = new RegExp(`(\\d+)${fr.Room.progressPercent.replace('{percent}', '')}`);

// The rival's percentage as each page drew it, first time each value appears; a finished row counts as 100.
function progressOf(changes: RosterChange[], trainerName: string): ProgressAt[] {
  const progress: ProgressAt[] = [];
  for (const { rows, at } of changes) {
    const row = rows.find((text) => text.includes(trainerName));
    const afterName = row?.slice(row.indexOf(trainerName) + trainerName.length) ?? '';
    const percent = afterName.includes(fr.Room.finished) ? 100 : Number(afterName.match(percentPattern)?.[1] ?? 0);
    if (percent > (progress.at(-1)?.percent ?? 0)) progress.push({ percent, at });
  }
  return progress;
}

// For each value Zoe reached, how long until Alex's page showed it or anything further.
function deliveryLatencies(typed: ProgressAt[], seen: ProgressAt[]): number[] {
  return typed.map(({ percent, at }) => (seen.find((shown) => shown.percent >= percent)?.at ?? Number.POSITIVE_INFINITY) - at);
}

function percentile95(values: number[]): number {
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.ceil(sorted.length * 0.95) - 1]!;
}

function countSnapshotRequests(page: Page): () => number {
  let requests = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/snapshot')) requests += 1;
  });
  return () => requests;
}

async function waitForSubscription(frames: PushFrame[], roomId: string, count = 1): Promise<void> {
  await expect.poll(() => subscriptionCount(frames, roomId), { timeout: 20_000 }).toBeGreaterThanOrEqual(count);
}

test.describe('live updates by push', () => {
  test('over a full race, Alex sees each step of Zoe’s progress within 500 ms at the 95th percentile, delivered by push', async ({ browser, page }) => {
    const alexFrames = recordPageFrames(page);
    const { alexPage, zoePage, roomId, zoe } = await startTwoPlayerRace(browser, page);
    await waitForSubscription(alexFrames, roomId);
    const pingsBefore = revisionPingsIn(alexFrames, roomId).length;

    await zoePage.keyboard.type(testPassage, { delay: childTypingDelayMs });
    await expect(racerRow(alexPage, zoe)).toContainText(fr.Room.finished, { timeout: catchUpBoundMs });

    const typed = progressOf(await readRosterChanges(zoePage), zoe);
    const seen = progressOf(await readRosterChanges(alexPage), zoe);
    const latencies = deliveryLatencies(typed, seen);
    const p95 = percentile95(latencies);
    console.log(`push delivery p95 ${p95.toFixed(0)} ms, max ${Math.max(...latencies).toFixed(0)} ms, over ${latencies.length} steps`);
    expect(typed.length).toBeGreaterThan(20);
    expect(p95).toBeLessThan(pushLatencyBoundMs);
    expect(revisionPingsIn(alexFrames, roomId).length - pingsBefore).toBeGreaterThanOrEqual(seen.length - 1);

    // Alex is still racing, so polling alone would ask four times a second; the slow keepalive pace proves push carried the updates.
    const snapshotRequests = countSnapshotRequests(alexPage);
    await alexPage.waitForTimeout(3_000);
    expect(snapshotRequests()).toBeLessThanOrEqual(4);
    await zoePage.context().close();
  });

  test('after Zoe’s connection drops for 10 seconds, her page catches up within 2 seconds without a refresh, in French, and push resumes', async ({ browser, page }) => {
    let cutter: PushSocketCutter | undefined;
    let zoeFrames: PushFrame[] = [];
    const { alexPage, zoePage, roomId, alex, zoe } = await startTwoPlayerRace(browser, page, { prepareZoe: async (context) => {
      cutter = await PushSocketCutter.install(context);
      zoeFrames = recordContextFrames(context);
    } });
    await waitForSubscription(zoeFrames, roomId);
    await zoePage.evaluate(() => ((window as unknown as { isSameDocument: boolean }).isSameDocument = true));

    await cutter!.cut();
    await zoePage.route('**/snapshot', (route) => route.abort());
    await alexPage.keyboard.type(testPassage.slice(0, 6), { delay: childTypingDelayMs });
    await expect(zoePage.getByText(fr.Room.reconnecting)).toBeVisible();
    await expectEveryVisibleStringFromCatalog(zoePage, [alex, zoe, ...passageFragments(testPassage)]);
    await zoePage.waitForTimeout(dropMs - 6 * childTypingDelayMs);
    await expect(racerRow(zoePage, alex)).not.toContainText(percentText(progressPercent(6, fullLength)));

    const restoredAt = Date.now();
    cutter!.restore();
    await zoePage.unroute('**/snapshot');
    await expect(racerRow(zoePage, alex)).toContainText(percentText(progressPercent(6, fullLength)), { timeout: catchUpBoundMs });
    expect(Date.now() - restoredAt).toBeLessThan(catchUpBoundMs);
    await expect(zoePage.getByText(fr.Room.reconnecting)).toBeHidden();
    expect(await zoePage.evaluate(() => (window as unknown as { isSameDocument?: boolean }).isSameDocument)).toBe(true);

    await waitForSubscription(zoeFrames, roomId, 2);
    const pingsBefore = revisionPingsIn(zoeFrames, roomId).length;
    await alexPage.keyboard.type(testPassage.slice(6, 7));
    await expect(racerRow(zoePage, alex)).toContainText(percentText(progressPercent(7, fullLength)), { timeout: catchUpBoundMs });
    expect(revisionPingsIn(zoeFrames, roomId).length).toBeGreaterThan(pingsBefore);
    await zoePage.context().close();
  });
});

test.describe('race end by push', () => {
  test('at the time limit, the read that settles the race pushes the results to the rival, whose own snapshot reads are cut until the ping arrives', async ({ browser, page }) => {
    const timeLimitMs = 6_000;
    const alexFrames = recordPageFrames(page);
    const { alexPage, zoePage, roomId } = await startTwoPlayerRace(browser, page, { timeLimitMs });
    await waitForSubscription(alexFrames, roomId);
    const pingsBefore = revisionPingsIn(alexFrames, roomId).length;
    const hasPing = () => revisionPingsIn(alexFrames, roomId).length > pingsBefore;
    await alexPage.route('**/snapshot', (route) => (hasPing() ? route.continue() : route.abort()));

    await expect(resultsTable(zoePage)).toBeVisible({ timeout: timeLimitMs + catchUpBoundMs });
    await expect.poll(hasPing, { timeout: catchUpBoundMs }).toBe(true);
    await expect(resultsTable(alexPage)).toBeVisible({ timeout: catchUpBoundMs });
    expect(await readResultCells(alexPage)).toEqual(await readResultCells(zoePage));
    await zoePage.context().close();
  });
});

const deadPushServerPort = Number(process.env.E2E_PORT ?? 3100) + 2;
const productionBuildExists = existsSync(path.join(process.cwd(), '.next', 'BUILD_ID'));

async function closedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as { port: number };
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test.describe('separate production server: push service unreachable', () => {
  test.describe.configure({ mode: 'default' });
  test.skip(!productionBuildExists, 'starts a second production server from the existing build');
  test.use({ baseURL: `http://localhost:${deadPushServerPort}` });

  let appServer: AppServer | undefined;

  test.beforeAll(async () => {
    appServer = await startAppServer(deadPushServerPort, process.env.TEST_DATABASE_URL!, { PUSHER_PORT: String(await closedPort()) });
  });

  test.afterAll(async () => {
    await appServer?.stop();
  });

  test('players fall back to polling and the race still finishes with the correct results', async ({ browser, page }) => {
    test.setTimeout(60_000);
    const alexFrames = recordPageFrames(page);
    const { alexPage, zoePage, roomId, zoe } = await startTwoPlayerRace(browser, page);
    const snapshotRequests = countSnapshotRequests(alexPage);

    await zoePage.keyboard.type(testPassage, { delay: childTypingDelayMs });
    await expect(racerRow(alexPage, zoe)).toContainText(fr.Room.finished, { timeout: catchUpBoundMs });
    expect(snapshotRequests()).toBeGreaterThan(10);
    await alexPage.keyboard.type(testPassage, { delay: childTypingDelayMs / 2 });

    for (const shown of [alexPage, zoePage]) await expect(resultsTable(shown)).toBeVisible({ timeout: catchUpBoundMs });
    const expected = expectedResultCells((await readSettledRace(roomId)).results, 'fr');
    expect(expected.map((cells) => cells.slice(0, 2))).toEqual([
      ['1', zoe],
      ['2', expect.any(String)],
    ]);
    expect(await readResultCells(alexPage)).toEqual(expected);
    expect(await readResultCells(zoePage)).toEqual(expected);
    expect(subscriptionCount(alexFrames, roomId)).toBe(0);
    await zoePage.context().close();
  });
});
