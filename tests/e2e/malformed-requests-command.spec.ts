import { expect, test, type APIResponse, type Page } from '@playwright/test';
import { uniqueName } from './support/guests';
import { postChannelAuth } from './support/push';
import { openRoomAsNewGuest, snapshotPath } from './support/rooms';

type JsonRoute = { command: string; valid: object; wrongType: object; tooLong: object };

const validSettings = { language: 'fr', length: 200, punctuation: true, accents: true, capitals: true, digits: false };
const validProgress = { sequence: 1, position: 1, keystrokes: 1, rejectedKeystrokes: 0 };

const jsonRoutes: JsonRoute[] = [
  { command: 'bots', valid: { level: 'easy' }, wrongType: { level: 7 }, tooLong: { level: 'x'.repeat(40) } },
  { command: 'visibility', valid: { visibility: 'public' }, wrongType: { visibility: ['public'] }, tooLong: { visibility: 'x'.repeat(40) } },
  { command: 'remove', valid: { memberKey: 'abc' }, wrongType: { memberKey: 12 }, tooLong: { memberKey: 'k'.repeat(100) } },
  { command: 'settings', valid: validSettings, wrongType: { ...validSettings, digits: 'yes' }, tooLong: { ...validSettings, language: 'f'.repeat(200) } },
  { command: 'progress', valid: validProgress, wrongType: { ...validProgress, position: '1' }, tooLong: { ...validProgress, position: 2 ** 40 } },
];

function post(page: Page, path: string, body: unknown): Promise<APIResponse> {
  const headers = { origin: new URL(page.url()).origin, 'content-type': 'application/json' };
  return page.request.post(path, { headers, data: JSON.stringify(body) });
}

function withoutKey(object: Record<string, unknown>, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(object).filter(([name]) => name !== key));
}

async function readSnapshot(page: Page, roomId: string): Promise<unknown> {
  const snapshot = (await (await page.request.get(snapshotPath(roomId))).json()) as Record<string, unknown>;
  return withoutKey(snapshot, 'serverNow');
}

async function expectInvalidRequest(response: APIResponse): Promise<void> {
  expect(response.status()).toBe(400);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.body()).toHaveLength(0);
}

test.describe('malformed JSON requests to a room', () => {
  for (const { command, valid, wrongType, tooLong } of jsonRoutes) {
    test(`${command}: a missing field, a wrong type, an extra field and an over-long value are refused with 400 and change nothing`, async ({ page }) => {
      const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
      const before = await readSnapshot(page, roomId);
      const missingField = withoutKey(valid as Record<string, unknown>, Object.keys(valid)[0]!);

      for (const body of [missingField, wrongType, { ...valid, winner: 'Alex', xp: 9999 }, tooLong, null, []]) {
        await expectInvalidRequest(await post(page, `/api/rooms/${roomId}/${command}`, body));
      }

      expect(await readSnapshot(page, roomId)).toEqual(before);
    });
  }
});

test.describe('the channel authorization endpoint', () => {
  test('refuses a malformed socket id or a body that names a channel, and grants no signature', async ({ page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const bodies = [{}, { socketId: 42 }, { socketId: 'abc' }, { socketId: '1.2\n' }, { socketId: '1.2', channel_name: 'private-room-other' }];

    for (const body of bodies) {
      const response = await postChannelAuth(page, roomId, body);
      expect(response.status()).toBe(400);
      expect(await response.text()).not.toContain('auth');
    }
  });

  test('answers 404 when the room in the path is not a room id', async ({ page }) => {
    await openRoomAsNewGuest(page, uniqueName('Alex '));

    expect((await postChannelAuth(page, 'private-room-other', { socketId: '1.2' })).status()).toBe(404);
  });
});
