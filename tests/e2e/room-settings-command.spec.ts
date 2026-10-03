import { expect } from '@playwright/test';
import { raceWordLists } from '../../src/assets/word-lists';
import type { GuestId } from '../../src/domain/guest-id';
import type { RoomId } from '../../src/domain/room-id';
import { defaultTextSettings, type TextSettings } from '../../src/domain/text-settings';
import type { Database } from '../../src/server/db/types';
import { changeRoomTextSettings, type ChangeTextSettingsResult } from '../../src/server/rooms/change-room-settings';
import { prepareNextRace } from '../../src/server/rooms/prepare-next-race';
import { findTextSettings } from '../../src/server/rooms/room-text-settings';
import { startRace } from '../../src/server/rooms/start-race';
import { commandTest as test, insertGuest, joinRoomNow, openRoomForNewHost } from './support/commands';
import { uniqueName, withTestDatabase } from './support/guests';
import { readIdleState, readRoomRevision, setLobbyInactiveFor, setRoomPhase } from './support/rooms';
import { finishRaceInDatabase } from './support/settlement';

type Room = { roomId: RoomId; hostId: GuestId; zoeId: GuestId; zoe: string };

const englishPractice: TextSettings = { language: 'en', length: 450, punctuation: false, accents: true, capitals: true, digits: true };

async function waitingRoom(database: Database): Promise<Room> {
  const { roomId, hostId } = await openRoomForNewHost(database);
  const zoe = uniqueName('Zoe ');
  const zoeId = await insertGuest(zoe);
  await joinRoomNow(database, roomId, zoeId);
  return { roomId, hostId, zoeId, zoe };
}

function change(database: Database, roomId: RoomId, guestId: GuestId, settings: TextSettings): Promise<ChangeTextSettingsResult> {
  return changeRoomTextSettings(database, { roomId, guestId, settings, changedAt: new Date() });
}

async function passageFor(database: Database, settings: TextSettings): Promise<string> {
  const room = await waitingRoom(database);
  expect(await change(database, room.roomId, room.hostId, settings)).toBe('changed');
  expect(await startRace(database, { roomId: room.roomId, guestId: room.hostId, requestedAt: new Date() })).toBe('started');
  const [race] = await withTestDatabase((sql) => sql`select passage from races where room_id = ${room.roomId}`);
  return race!.passage as string;
}

test.describe('changing the race text settings', () => {
  test('the host saves new settings: stored, one revision, and counted as lobby activity', async ({ database }) => {
    const { roomId, hostId } = await waitingRoom(database);
    await setLobbyInactiveFor(roomId, 60_000);
    const revisionBefore = await readRoomRevision(roomId);
    const activityBefore = (await readIdleState(roomId)).lastActivityAt;

    expect(await change(database, roomId, hostId, englishPractice)).toBe('changed');
    expect(await findTextSettings(database, roomId)).toEqual(englishPractice);
    expect(await readRoomRevision(roomId)).toBe(revisionBefore + 1);
    expect((await readIdleState(roomId)).lastActivityAt.getTime()).toBeGreaterThan(activityBefore.getTime());
  });

  test('sending the current settings again changes nothing', async ({ database }) => {
    const { roomId, hostId } = await waitingRoom(database);
    const revisionBefore = await readRoomRevision(roomId);

    expect(await change(database, roomId, hostId, defaultTextSettings('fr'))).toBe('unchanged');
    expect(await readRoomRevision(roomId)).toBe(revisionBefore);
  });

  test('only the host, only a member and only in the waiting room', async ({ database }) => {
    const { roomId, zoeId } = await waitingRoom(database);
    const stranger = await insertGuest(uniqueName('Nina '));
    const { hostId: otherHost, roomId: racingRoomId } = await openRoomForNewHost(database);
    await setRoomPhase(racingRoomId, 'racing');

    expect(await change(database, roomId, zoeId, englishPractice)).toBe('not-host');
    expect(await change(database, roomId, stranger, englishPractice)).toBe('not-member');
    expect(await change(database, racingRoomId, otherHost, englishPractice)).toBe('race-started');
    expect(await findTextSettings(database, roomId)).toEqual(defaultTextSettings('fr'));
  });

  test('the settings stay when the host prepares the next race', async ({ database }) => {
    const room = await waitingRoom(database);
    await change(database, room.roomId, room.hostId, englishPractice);
    await startRace(database, { roomId: room.roomId, guestId: room.hostId, requestedAt: new Date(Date.now() - 10_000) });
    const [host] = await withTestDatabase((sql) => sql`select trainer_name from guests where id = ${room.hostId}`);
    await finishRaceInDatabase(room.roomId, [
      { trainerName: host!.trainer_name as string, elapsedMs: 4_000, rejectedKeystrokes: 0 },
      { trainerName: room.zoe, elapsedMs: 5_000, rejectedKeystrokes: 0 },
    ]);

    expect(await prepareNextRace(database, { roomId: room.roomId, guestId: room.hostId, preparedAt: new Date() })).toBe('prepared');
    expect(await findTextSettings(database, room.roomId)).toEqual(englishPractice);
  });
});

test.describe('the text a start draws from the settings', () => {
  const bare: TextSettings = { language: 'fr', length: 300, punctuation: false, accents: true, capitals: false, digits: false };

  test('fits the chosen length at a word boundary, at both ends of the slider', async ({ database }) => {
    for (const length of [100, 800]) {
      const passage = await passageFor(database, { ...bare, length });
      expect(Array.from(passage).length).toBeLessThanOrEqual(length);
      expect(Array.from(passage).length).toBeGreaterThan(length - 16);
      for (const word of passage.split(' ')) expect(raceWordLists.fr).toContain(word);
    }
  });

  test('accents off keeps only plain letters; on lets accented words in', async ({ database }) => {
    expect(await passageFor(database, { ...bare, length: 800, accents: false })).toMatch(/^[a-z ]+$/u);
    expect(await passageFor(database, { ...bare, length: 800 })).toMatch(/[àâçéèêîôùû]/u);
  });

  test('punctuation and capitals give sentences that start with a capital and end with a mark', async ({ database }) => {
    const passage = await passageFor(database, { ...bare, punctuation: true, capitals: true });
    expect(passage).toMatch(/^[A-Z]/u);
    expect(passage).toMatch(/[.?]$/u);
  });

  test('digits mix numbers into the words', async ({ database }) => {
    expect(await passageFor(database, { ...bare, length: 800, digits: true })).toMatch(/\d/u);
  });
});
