import { expect } from '@playwright/test';
import type { GuestId } from '../../src/domain/guest-id';
import type { RoomId } from '../../src/domain/room-id';
import { insertAccount, openAccount } from '../../src/server/accounts/account-commands';
import { logInWithPassword } from '../../src/server/accounts/log-in';
import { hashPassword } from '../../src/server/accounts/password-hash';
import type { Database } from '../../src/server/db/types';
import { findPastRaceResults } from '../../src/server/rooms/past-race-results';
import { findCurrentRace } from '../../src/server/rooms/race-rows';
import { openRoom } from '../../src/server/rooms/room-commands';
import { findRoomSnapshot } from '../../src/server/rooms/room-snapshot';
import { startRace } from '../../src/server/rooms/start-race';
import { createGuestSession } from '../../src/server/sessions/session-store';
import { chooseStarter, choosePartner } from '../../src/server/trainer/collection-commands';
import { findPartner } from '../../src/server/trainer/partner';
import { loadTrainerProfile } from '../../src/server/trainer/trainer-profile';
import { uniquePassword, uniqueUsername } from './support/accounts';
import { commandTest as test, insertGuest, joinRoomNow, openRoomForNewHost } from './support/commands';
import { uniqueName, withTestDatabase } from './support/guests';
import { finishRaceInDatabase, readSettledRace } from './support/settlement';
import { givePokemon, insertFinishedRaces, readCollectionOf, readEarnedBadges } from './support/trainer';

type RaceOfTwo = { roomId: RoomId; alexId: GuestId; zoeId: GuestId; alexName: string; zoeName: string };

async function namedGuest(prefix: string): Promise<{ id: GuestId; name: string }> {
  const name = uniqueName(prefix);
  return { id: await insertGuest(name), name };
}

async function startedRaceOfTwo(database: Database): Promise<RaceOfTwo> {
  const alex = await namedGuest('Alex ');
  const zoe = await namedGuest('Zoe ');
  await chooseStarter(database, alex.id, 4);
  await chooseStarter(database, zoe.id, 7);
  const roomId = await openRoom(database, { hostGuestId: alex.id, visibility: 'unlisted', openedAt: new Date() });
  await joinRoomNow(database, roomId, zoe.id);
  expect(await startRace(database, { roomId, guestId: alex.id, requestedAt: new Date(Date.now() - 60_000) })).toBe('started');
  return { roomId, alexId: alex.id, zoeId: zoe.id, alexName: alex.name, zoeName: zoe.name };
}

async function snapshotPartners(database: Database, race: RaceOfTwo): Promise<Record<string, string | null>> {
  const found = await findRoomSnapshot(database, race.roomId, race.alexId);
  if (found.kind !== 'snapshot') throw new Error(`no snapshot: ${found.kind}`);
  return Object.fromEntries(found.snapshot.members.map((member) => [member.trainerName, member.partner]));
}

test.describe('the starter', () => {
  test('is saved once, at level 5 with 0 XP, as the partner; a second choice changes nothing', async ({ database }) => {
    const guestId = await insertGuest(uniqueName('Alex '));
    expect(await chooseStarter(database, guestId, 1)).toBe('chosen');
    expect(await chooseStarter(database, guestId, 7)).toBe('already-chosen');
    expect(await readCollectionOf(guestId)).toEqual([{ dex: 1, level: 5, xp: 0, isPartner: true }]);
  });

  test('two simultaneous choices still give exactly one starter', async ({ database }) => {
    const guestId = await insertGuest(uniqueName('Alex '));
    const results = await Promise.all([chooseStarter(database, guestId, 1), chooseStarter(database, guestId, 4)]);
    expect(results.sort()).toEqual(['already-chosen', 'chosen']);
    expect(await readCollectionOf(guestId)).toHaveLength(1);
  });

  test('the database refuses a second partner and a species outside the Pokédex', async ({ database }) => {
    const guestId = await insertGuest(uniqueName('Alex '));
    await chooseStarter(database, guestId, 4);
    await expect(withTestDatabase((sql) => sql`insert into owned_pokemon (guest_id, dex, level, is_partner) values (${guestId}, 7, 5, true)`)).rejects.toThrow(/owned_pokemon_one_partner_unique/);
    await expect(withTestDatabase((sql) => sql`insert into owned_pokemon (guest_id, dex, level) values (${guestId}, 152, 5)`)).rejects.toThrow(/owned_pokemon_dex_check/);
  });
});

test.describe('the partner', () => {
  test('can be any owned Pokémon, never one the trainer does not own, and there is always exactly one', async ({ database }) => {
    const guestId = await insertGuest(uniqueName('Alex '));
    await chooseStarter(database, guestId, 4);
    expect(await choosePartner(database, guestId, 25)).toBe('not-owned');
    expect(await findPartner(database, guestId)).toEqual({ dex: 4, level: 5 });
    await givePokemon(guestId, 25, 12);
    expect(await choosePartner(database, guestId, 25)).toBe('chosen');
    expect((await readCollectionOf(guestId)).map(({ dex, isPartner }) => [dex, isPartner])).toEqual([[4, false], [25, true]]);
  });

  test('races for its trainer: the start records it, the snapshot shows it, and a later partner change never rewrites the race', async ({ database }) => {
    const race = await startedRaceOfTwo(database);
    expect(await snapshotPartners(database, race)).toEqual({ [race.alexName]: 'charmander', [race.zoeName]: 'squirtle' });
    await givePokemon(race.alexId, 25);
    await choosePartner(database, race.alexId, 25);
    expect((await snapshotPartners(database, race))[race.alexName]).toBe('charmander');

    await finishRaceInDatabase(race.roomId, [
      { trainerName: race.alexName, elapsedMs: 20_000, rejectedKeystrokes: 0 },
      { trainerName: race.zoeName, elapsedMs: 30_000, rejectedKeystrokes: 1 },
    ]);
    const settled = await findCurrentRace(database, race.roomId);
    const past = await findPastRaceResults(database, { roomId: race.roomId, raceId: settled!.id, viewerGuestId: race.zoeId });
    expect(Object.fromEntries(past!.racers.map((racer) => [racer.trainerName, racer.partner]))).toEqual({ [race.alexName]: 'charmander', [race.zoeName]: 'squirtle' });
  });

  test('a member without a starter shows no Pokémon rather than a made-up one', async ({ database }) => {
    const { roomId, hostId } = await openRoomForNewHost(database);
    const found = await findRoomSnapshot(database, roomId, hostId);
    expect(found.kind === 'snapshot' && found.snapshot.members[0]!.partner).toBeNull();
  });
});

test.describe('badges', () => {
  test('the first race finished to the end grants the Boulder Badge once; the racer stopped by abandoning gets none', async ({ database }) => {
    const race = await startedRaceOfTwo(database);
    await withTestDatabase((sql) => sql`update race_participants set abandoned_at = now() where guest_id = ${race.zoeId}`);
    await finishRaceInDatabase(race.roomId, [{ trainerName: race.alexName, elapsedMs: 20_000, rejectedKeystrokes: 0 }]);
    expect((await readSettledRace(race.roomId)).endedAt).not.toBeNull();
    expect(await readEarnedBadges(race.alexId)).toEqual(['boulder']);
    expect(await readEarnedBadges(race.zoeId)).toEqual([]);
    await finishRaceInDatabase(race.roomId, [{ trainerName: race.alexName, elapsedMs: 20_000, rejectedKeystrokes: 0 }]);
    expect(await readEarnedBadges(race.alexId)).toEqual(['boulder']);
  });

  test('the fifth finished race grants the Cascade Badge, while a first finish grants only the Boulder Badge', async ({ database }) => {
    const race = await startedRaceOfTwo(database);
    await insertFinishedRaces(race.alexId, (await openRoomForNewHost(database)).roomId, 4);
    await withTestDatabase((sql) => sql`insert into earned_badges (guest_id, badge) values (${race.alexId}, 'boulder')`);
    await finishRaceInDatabase(race.roomId, [
      { trainerName: race.alexName, elapsedMs: 20_000, rejectedKeystrokes: 0 },
      { trainerName: race.zoeName, elapsedMs: 25_000, rejectedKeystrokes: 0 },
    ]);
    expect(await readEarnedBadges(race.alexId)).toEqual(['boulder', 'cascade']);
    expect(await readEarnedBadges(race.zoeId)).toEqual(['boulder']);
  });
});

test.describe('trainer statistics', () => {
  test('come from settled results only, with the last three races newest first and a record per racing Pokémon', async ({ database }) => {
    const race = await startedRaceOfTwo(database);
    expect((await loadTrainerProfile(database, race.alexId)).stats).toEqual({ races: 0, wins: 0, averageWpm: null, accuracy: null });
    await insertFinishedRaces(race.alexId, (await openRoomForNewHost(database)).roomId, 3, 2);
    await finishRaceInDatabase(race.roomId, [
      { trainerName: race.alexName, elapsedMs: 20_000, rejectedKeystrokes: 0 },
      { trainerName: race.zoeName, elapsedMs: 30_000, rejectedKeystrokes: 0 },
    ]);
    const profile = await loadTrainerProfile(database, race.alexId);
    expect(profile.stats.races).toBe(4);
    expect(profile.stats.wins).toBe(1);
    expect(profile.stats.accuracy).toBe(1);
    expect(profile.recentRaces).toHaveLength(3);
    expect(profile.recentRaces[0]!.place).toBe(1);
    expect(profile.collection).toEqual([{ dex: 4, level: 5, xp: 0, isPartner: true, record: { races: 1, wins: 1, bestWpm: expect.any(Number) } }]);
    expect(profile.achievements).toMatchObject({ finishedRaces: 4, wins: 1, speciesOwned: 1, badgesEarned: 1 });
  });
});

test.describe('accounts and collections', () => {
  test('opening an account keeps the guest starter in the same transaction', async ({ database }) => {
    const { token, guestId } = await createGuestSession(database, uniqueName('Alex '));
    await chooseStarter(database, guestId, 7);
    const opened = await openAccount(database, { username: uniqueUsername('Collect_'), passwordHash: await hashPassword(uniquePassword()) }, token);
    expect(opened.outcome).toBe('opened');
    const [row] = await withTestDatabase((sql) => sql`select guest_id from users where guest_id = ${guestId}`);
    expect(row?.guest_id).toBe(guestId);
    expect(await findPartner(database, guestId)).toEqual({ dex: 7, level: 5 });
  });

  test('logging into an existing account shows its own collection and never merges the guest one', async ({ database }) => {
    const password = uniquePassword();
    const username = uniqueUsername('Owner_');
    const account = await database.transaction(async (transaction) => insertAccount(transaction, { username, passwordHash: await hashPassword(password) }));
    await chooseStarter(database, account.guestId, 7);
    const guest = await createGuestSession(database, uniqueName('Alex '));
    await chooseStarter(database, guest.guestId, 1);
    expect((await logInWithPassword(database, { username, password, presentedSessionToken: guest.token })).outcome).toBe('loggedIn');
    expect((await readCollectionOf(account.guestId)).map(({ dex }) => dex)).toEqual([7]);
    expect((await readCollectionOf(guest.guestId)).map(({ dex }) => dex)).toEqual([1]);
  });
});
