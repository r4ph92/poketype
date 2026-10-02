import { expect, test, type APIResponse, type Page } from '@playwright/test';
import { uniqueName } from './support/guests';
import { postChannelAuth, RawPushSocket, recordPageFrames, revisionPingsIn, roomChannel, type PushFrame } from './support/push';
import { createRoom, newGuestPage, openRoomAsNewGuest, playerRows, readRoomRevision, roomPagePath } from './support/rooms';

const quietWindowMs = 1_500;
const clientEventsDisabled = 4301;

async function expectEmptyRefusal(response: APIResponse, status: number): Promise<void> {
  expect(response.status()).toBe(status);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.body()).toHaveLength(0);
}

async function signatureFor(page: Page, roomId: string, socket: RawPushSocket): Promise<string> {
  const response = await postChannelAuth(page, roomId, { socketId: socket.socketId });
  expect(response.status()).toBe(200);
  return ((await response.json()) as { auth: string }).auth;
}

function isRefusal(frame: PushFrame): boolean {
  return frame.event === 'pusher:subscription_error' || frame.event === 'pusher:error';
}

test.describe('who may listen to a room channel', () => {
  test('Nina, who is not in the room, is refused a signature and receives no participant data', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const ninaPage = await newGuestPage(browser, uniqueName('Nina '));
    const nina = await RawPushSocket.open();

    await expectEmptyRefusal(await postChannelAuth(ninaPage, roomId, { socketId: nina.socketId }), 403);
    const refused = await nina.subscribe(roomChannel(roomId), `${nina.socketId}:forged`);
    expect(isRefusal(refused)).toBe(true);

    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    await zoePage.goto(roomPagePath(roomId));
    await expect(playerRows(page)).toHaveCount(2);
    await ninaPage.waitForTimeout(quietWindowMs);
    expect(nina.eventsOn(roomChannel(roomId))).toEqual([]);
    nina.close();
    await ninaPage.context().close();
    await zoePage.context().close();
  });

  test('a signature for Nina’s own room does not open Alex’s room, and a signature only works for the socket it was made for', async ({ browser, page }) => {
    const alexRoomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const ninaPage = await newGuestPage(browser, uniqueName('Nina '));
    await ninaPage.goto('/play');
    const ninaRoomId = await createRoom(ninaPage);
    const nina = await RawPushSocket.open();
    const otherSocket = await RawPushSocket.open();

    const ninaSignature = await signatureFor(ninaPage, ninaRoomId, nina);
    expect(isRefusal(await nina.subscribe(roomChannel(alexRoomId), ninaSignature))).toBe(true);
    expect(isRefusal(await otherSocket.subscribe(roomChannel(ninaRoomId), ninaSignature))).toBe(true);
    expect((await nina.subscribe(roomChannel(ninaRoomId), ninaSignature)).event).toBe('pusher_internal:subscription_succeeded');
    nina.close();
    otherSocket.close();
    await ninaPage.context().close();
  });

  test('without a session, for an unknown room or with a malformed request, no signature is given', async ({ browser, page }) => {
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const socket = await RawPushSocket.open();
    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto('/');

    await expectEmptyRefusal(await postChannelAuth(visitor, roomId, { socketId: socket.socketId }), 401);
    await expectEmptyRefusal(await postChannelAuth(page, crypto.randomUUID(), { socketId: socket.socketId }), 404);
    await expectEmptyRefusal(await postChannelAuth(page, 'not-a-room', { socketId: socket.socketId }), 404);
    await expectEmptyRefusal(await postChannelAuth(page, roomId, { socketId: 'abc' }), 400);
    await expectEmptyRefusal(await postChannelAuth(page, roomId, { socketId: `${socket.socketId}\n` }), 400);
    await expectEmptyRefusal(await postChannelAuth(page, roomId, { channel: roomChannel(roomId) }), 400);
    await expectEmptyRefusal(await postChannelAuth(page, roomId, { socketId: socket.socketId, padding: 'x'.repeat(400) }), 413);
    await expectEmptyRefusal(await postChannelAuth(page, roomId, { socketId: socket.socketId }, { 'content-type': 'text/plain' }), 415);
    expect((await postChannelAuth(page, roomId, { socketId: socket.socketId }, { 'sec-fetch-site': 'cross-site' })).status()).toBe(403);
    socket.close();
    await visitor.context().close();
  });
});

test.describe('only the server publishes', () => {
  test('a member who publishes straight to the room channel reaches nobody, and the room is unchanged', async ({ browser, page }) => {
    const alexFrames = recordPageFrames(page);
    const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
    const zoePage = await newGuestPage(browser, uniqueName('Zoé '));
    await zoePage.goto(roomPagePath(roomId));
    await expect(playerRows(page)).toHaveCount(2);
    const revisionBefore = await readRoomRevision(roomId);
    const attacker = await RawPushSocket.open();
    const listener = await RawPushSocket.open();
    const channel = roomChannel(roomId);
    expect((await attacker.subscribe(channel, await signatureFor(zoePage, roomId, attacker))).event).toBe('pusher_internal:subscription_succeeded');
    expect((await listener.subscribe(channel, await signatureFor(zoePage, roomId, listener))).event).toBe('pusher_internal:subscription_succeeded');

    attacker.send({ event: 'client-revision', channel, data: { revision: revisionBefore + 100 } });
    attacker.send({ event: 'revision', channel, data: { revision: revisionBefore + 100 } });
    await page.waitForTimeout(quietWindowMs);

    expect(attacker.frames.some((frame) => frame.event === 'pusher:error' && (frame.data as { code?: number }).code === clientEventsDisabled)).toBe(true);
    expect(listener.eventsOn(channel)).toEqual([]);
    expect(alexFrames.filter((frame) => frame.event.includes('revision') && frame.event !== 'revision')).toEqual([]);
    expect(revisionPingsIn(alexFrames, roomId).every((revision) => revision <= revisionBefore)).toBe(true);
    expect(await readRoomRevision(roomId)).toBe(revisionBefore);
    await expect(playerRows(page)).toHaveCount(2);
    attacker.close();
    listener.close();
    await zoePage.context().close();
  });
});
