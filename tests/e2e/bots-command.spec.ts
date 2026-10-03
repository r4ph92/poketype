import { expect } from '@playwright/test';
import { charactersOfLevel, type BotLevel } from '../../src/assets/bot-characters';
import { gameConfig } from '../../src/config/game';
import { botMemberKey } from '../../src/domain/bot-member';
import { botProgressAt } from '../../src/domain/bot-race';
import type { GuestId } from '../../src/domain/guest-id';
import { passageLength } from '../../src/domain/passage';
import { raceCoinsFor } from '../../src/domain/race-coins';
import type { RoomId } from '../../src/domain/room-id';
import type { Database } from '../../src/server/db/types';
import { prepareNextRace } from '../../src/server/rooms/prepare-next-race';
import { findPublicRooms } from '../../src/server/rooms/public-rooms';
import { removePlayer } from '../../src/server/rooms/remove-player';
import { reportProgress } from '../../src/server/rooms/report-progress';
import { addBot, type AddBotResult } from '../../src/server/rooms/room-bots';
import { findRoomSnapshot } from '../../src/server/rooms/room-snapshot';
import { startRace } from '../../src/server/rooms/start-race';
import { findRaceRecords } from '../../src/server/trainer/race-record';
import { addBotToRoom, readRaceBots, readRoomBots } from './support/bots';
import { commandTest as test, insertGuest, joinRoomNow, openRoomForNewHost } from './support/commands';
import { uniqueName, withTestDatabase } from './support/guests';
import { readParticipants, readRoomPhase, readRoomRaces, readRoomRevision } from './support/rooms';

const longAgoMs = 120_000;

function add(database: Database, roomId: RoomId, guestId: GuestId, level: BotLevel): Promise<AddBotResult> {
  return addBot(database, { roomId, guestId, level, addedAt: new Date() });
}

function removeBot(database: Database, roomId: RoomId, guestId: GuestId, memberKey: string) {
  return removePlayer(database, { roomId, guestId, memberKey, removedAt: new Date() });
}

// Started two minutes ago through the real command, so the race is already running and its text and seeds are the server's own.
async function startSoloRaceLongAgo(database: Database, roomId: RoomId, hostId: GuestId): Promise<{ startsAt: Date; passage: string }> {
  expect(await startRace(database, { roomId, guestId: hostId, requestedAt: new Date(Date.now() - longAgoMs) })).toBe('started');
  const [race] = await readRoomRaces(roomId);
  return { startsAt: race!.startsAt, passage: race!.passage };
}

async function readCoinsOf(guestId: GuestId): Promise<number[]> {
  return withTestDatabase(async (sql) => (await sql`select amount from coin_entries where guest_id = ${guestId} and reason = 'race'`).map((row) => row.amount as number));
}

test.describe('adding and removing bots', () => {
  test('the host adds a bot of a level: a character of that level takes a seat, after the players, with one revision', async ({ database }) => {
    const { roomId, hostId } = await openRoomForNewHost(database);
    const revisionBefore = await readRoomRevision(roomId);

    expect(await add(database, roomId, hostId, 'medium')).toBe('added');

    const [bot] = await readRoomBots(roomId);
    expect(charactersOfLevel('medium').map((character) => character.id)).toContain(bot!.character);
    expect(await readRoomRevision(roomId)).toBe(revisionBefore + 1);
    const found = await findRoomSnapshot(database, roomId, hostId);
    if (found.kind !== 'snapshot') throw new Error('expected a snapshot');
    expect(found.snapshot.members).toHaveLength(2);
    expect(found.snapshot.members[1]).toMatchObject({ memberKey: botMemberKey(bot!.character), isHost: false, isViewer: false, hasAccount: false, bot: { character: bot!.character, level: 'medium', seed: null } });
  });

  test('only the host, only in the waiting room: other players and outsiders are refused', async ({ database }) => {
    const { roomId, hostId } = await openRoomForNewHost(database);
    const zoeId = await insertGuest(uniqueName('Zoe '));
    const outsiderId = await insertGuest(uniqueName('Out '));
    await joinRoomNow(database, roomId, zoeId);

    expect(await add(database, roomId, zoeId, 'easy')).toBe('not-host');
    expect(await add(database, roomId, outsiderId, 'easy')).toBe('not-member');
    await startRace(database, { roomId, guestId: hostId, requestedAt: new Date() });
    expect(await add(database, roomId, hostId, 'easy')).toBe('race-started');
    expect(await readRoomBots(roomId)).toEqual([]);
  });

  test('never seats one character twice: once every character of a level is in, that level is full', async ({ database }) => {
    const { roomId, hostId } = await openRoomForNewHost(database);
    const experts = charactersOfLevel('expert');

    for (let added = 0; added < experts.length; added += 1) expect(await add(database, roomId, hostId, 'expert')).toBe('added');
    expect(await add(database, roomId, hostId, 'expert')).toBe('level-full');

    const seated = (await readRoomBots(roomId)).map((bot) => bot.character);
    expect(new Set(seated).size).toBe(experts.length);
    expect(seated.sort()).toEqual(experts.map((character) => character.id).sort());
  });

  test('bots count toward the room capacity: a room they fill takes no bot, no player and is not offered', async ({ database }) => {
    const { roomId, hostId } = await openRoomForNewHost(database);
    const levels = (['beginner', 'easy', 'medium', 'hard'] as const).flatMap((level) => charactersOfLevel(level).map(() => level));
    for (const level of levels.slice(0, gameConfig.rooms.capacity - 1)) expect(await add(database, roomId, hostId, level)).toBe('added');

    expect(await add(database, roomId, hostId, 'expert')).toBe('full');
    expect(await joinRoomNow(database, roomId, await insertGuest(uniqueName('Late ')))).toBe('full');
    const listed = await findPublicRooms(database, 1_000, new Date());
    expect(listed.map((room) => room.roomId)).not.toContain(roomId);
  });

  test('the public list counts only the players of a room that has bots', async ({ database }) => {
    const { roomId, hostId } = await openRoomForNewHost(database);
    await add(database, roomId, hostId, 'beginner');
    await add(database, roomId, hostId, 'beginner');

    const listed = await findPublicRooms(database, 1_000, new Date());
    expect(listed.find((room) => room.roomId === roomId)?.playerCount).toBe(1);
  });

  test('the host removes a bot from the waiting room with its member key; nobody else can, and an unknown bot is refused', async ({ database }) => {
    const { roomId, hostId } = await openRoomForNewHost(database);
    const zoeId = await insertGuest(uniqueName('Zoe '));
    await joinRoomNow(database, roomId, zoeId);
    await addBotToRoom(roomId, 'brock', 'beginner');

    expect(await removeBot(database, roomId, zoeId, botMemberKey('brock'))).toBe('not-host');
    expect(await removeBot(database, roomId, hostId, botMemberKey('misty'))).toBe('unknown-player');
    expect(await removeBot(database, roomId, hostId, 'bot-gary')).toBe('unknown-player');
    const revisionBefore = await readRoomRevision(roomId);
    expect(await removeBot(database, roomId, hostId, botMemberKey('brock'))).toBe('removed');
    expect(await readRoomBots(roomId)).toEqual([]);
    expect(await readRoomRevision(roomId)).toBe(revisionBefore + 1);
  });

  test('a bot racing is never inactive, so the host cannot remove it from the race', async ({ database }) => {
    const { roomId, hostId } = await openRoomForNewHost(database);
    await addBotToRoom(roomId, 'brock', 'beginner');
    await startSoloRaceLongAgo(database, roomId, hostId);

    expect(await removeBot(database, roomId, hostId, botMemberKey('brock'))).toBe('still-active');
    expect(await readRoomBots(roomId)).toHaveLength(1);
  });
});

test.describe('racing against bots', () => {
  test('one player and one bot can start: the bot enters the race with its own seed and no participant row', async ({ database }) => {
    const { roomId, hostId } = await openRoomForNewHost(database);
    await addBotToRoom(roomId, 'misty', 'beginner');

    expect(await startRace(database, { roomId, guestId: hostId, requestedAt: new Date() })).toBe('started');

    expect(await readRoomPhase(roomId)).toBe('countdown');
    expect((await readParticipants(roomId)).map((participant) => participant.guestId)).toEqual([hostId]);
    const [bot] = await readRaceBots(roomId);
    expect(bot).toMatchObject({ character: 'misty', level: 'beginner', position: null, place: null });
    expect(Number.isSafeInteger(bot!.seed)).toBe(true);
  });

  test('a running race shows each bot where its seed puts it at the read', async ({ database }) => {
    const { roomId, hostId } = await openRoomForNewHost(database);
    await addBotToRoom(roomId, 'brock', 'beginner');
    const race = await startSoloRaceLongAgo(database, roomId, hostId);
    const [stored] = await readRaceBots(roomId);

    const before = Date.now();
    const found = await findRoomSnapshot(database, roomId, hostId);
    const after = Date.now();
    if (found.kind !== 'snapshot') throw new Error('expected a snapshot');
    const bot = found.snapshot.members.find((member) => member.bot !== null)!;
    const length = passageLength(race.passage);
    const earliest = botProgressAt({ level: 'beginner', seed: stored!.seed }, length, before - race.startsAt.getTime()).position;
    const latest = botProgressAt({ level: 'beginner', seed: stored!.seed }, length, after - race.startsAt.getTime()).position;
    expect(bot.bot?.seed).toBe(stored!.seed);
    expect(bot.progress!.position).toBeGreaterThanOrEqual(earliest);
    expect(bot.progress!.position).toBeLessThanOrEqual(latest);
  });

  test('the race ends when the only player finishes; bots are placed by their typing at the end, count as beaten racers and earn nothing', async ({ database }) => {
    const { roomId, hostId } = await openRoomForNewHost(database);
    await addBotToRoom(roomId, 'giovanni', 'expert');
    await addBotToRoom(roomId, 'brock', 'beginner');
    const race = await startSoloRaceLongAgo(database, roomId, hostId);
    const length = passageLength(race.passage);
    const finishAt = new Date(race.startsAt.getTime() + 60_000);

    const outcome = await reportProgress(database, { roomId, guestId: hostId, report: { sequence: 1, position: length, keystrokes: length, rejectedKeystrokes: 0 }, reportedAt: finishAt });

    expect(outcome.result).toBe('accepted');
    expect(await readRoomPhase(roomId)).toBe('results');
    const bots = await readRaceBots(roomId);
    const giovanni = bots.find((bot) => bot.character === 'giovanni')!;
    const brock = bots.find((bot) => bot.character === 'brock')!;
    expect(giovanni).toMatchObject({ place: 1, position: length });
    expect(giovanni.finishedAt!.getTime()).toBeLessThan(finishAt.getTime());
    expect(brock.place).toBe(3);
    expect(brock.finishedAt).toBeNull();
    expect(brock.position).toBe(botProgressAt({ level: 'beginner', seed: brock.seed }, length, 60_000).position);
    expect(await readCoinsOf(hostId)).toEqual([raceCoinsFor(2, 3)]);
    const records = await findRaceRecords(database, [hostId]);
    expect(records.get(hostId)).toMatchObject({ races: 1, wins: 0, finishedRaces: 1 });
  });

  test('the results list every bot as ranked with its member key, next to the players', async ({ database }) => {
    const { roomId, hostId } = await openRoomForNewHost(database);
    await addBotToRoom(roomId, 'n', 'expert');
    const race = await startSoloRaceLongAgo(database, roomId, hostId);
    const length = passageLength(race.passage);
    await reportProgress(database, { roomId, guestId: hostId, report: { sequence: 1, position: length, keystrokes: length, rejectedKeystrokes: 0 }, reportedAt: new Date(race.startsAt.getTime() + 60_000) });

    const found = await findRoomSnapshot(database, roomId, hostId);
    if (found.kind !== 'snapshot') throw new Error('expected a snapshot');
    expect(found.snapshot.race?.results).toContainEqual(expect.objectContaining({ memberKey: botMemberKey('n'), standing: 'ranked', place: 1 }));
    expect(found.snapshot.race?.results).toContainEqual(expect.objectContaining({ standing: 'ranked', place: 2 }));
    expect(found.snapshot.race?.coins?.race).toBe(raceCoinsFor(2, 2));
  });

  test('bots stay in the room when the host prepares the next race', async ({ database }) => {
    const { roomId, hostId } = await openRoomForNewHost(database);
    await addBotToRoom(roomId, 'n', 'expert');
    const race = await startSoloRaceLongAgo(database, roomId, hostId);
    const length = passageLength(race.passage);
    await reportProgress(database, { roomId, guestId: hostId, report: { sequence: 1, position: length, keystrokes: length, rejectedKeystrokes: 0 }, reportedAt: new Date(race.startsAt.getTime() + 60_000) });

    expect(await prepareNextRace(database, { roomId, guestId: hostId, preparedAt: new Date() })).toBe('prepared');

    expect((await readRoomBots(roomId)).map((bot) => bot.character)).toEqual(['n']);
  });
});
