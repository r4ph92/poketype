import { expect } from '@playwright/test';
import type { GuestId } from '../../src/domain/guest-id';
import type { RoomId } from '../../src/domain/room-id';
import type { Database } from '../../src/server/db/types';
import { findPastRaceResults } from '../../src/server/rooms/past-race-results';
import { findCurrentRace } from '../../src/server/rooms/race-rows';
import { openRoom } from '../../src/server/rooms/room-commands';
import { lockRoom } from '../../src/server/rooms/room-rows';
import { findRoomSnapshot } from '../../src/server/rooms/room-snapshot';
import { settleRace } from '../../src/server/rooms/settle-race';
import { choosePartner } from '../../src/server/trainer/collection-commands';
import { grantRaceXp } from '../../src/server/trainer/grant-race-xp';
import { loadTrainerProfile } from '../../src/server/trainer/trainer-profile';
import { commandTest as test, insertGuest, joinRoomNow } from './support/commands';
import { uniqueName, withTestDatabase } from './support/guests';
import { startRaceInDatabase } from './support/rooms';
import { finishRaceInDatabase, type RacerFinish } from './support/settlement';
import { givePokemon, readCollectionOf, type OwnedRow } from './support/trainer';

type Racer = { id: GuestId; name: string };

type PartnerSetup = { dex: number; level?: number; xp?: number };

type StoredGrant = { xp: number; dexBefore: number; levelBefore: number; xpBefore: number; dexAfter: number; levelAfter: number; xpAfter: number };

async function racerWith({ dex, level = 1, xp = 0 }: PartnerSetup): Promise<Racer> {
  const name = uniqueName('Racer ');
  const id = await insertGuest(name);
  await withTestDatabase((sql) => sql`insert into owned_pokemon (guest_id, dex, level, xp, is_partner) values (${id}, ${dex}, ${level}, ${xp}, true)`);
  return { id, name };
}

// Every racer joins one room whose race started a minute ago, each with the partner given.
async function raceWith(database: Database, partners: readonly PartnerSetup[]): Promise<{ roomId: RoomId; racers: Racer[] }> {
  const racers = await Promise.all(partners.map(racerWith));
  const roomId = await openRoom(database, { hostGuestId: racers[0]!.id, visibility: 'unlisted', openedAt: new Date() });
  for (const racer of racers.slice(1)) await joinRoomNow(database, roomId, racer.id);
  await startRaceInDatabase(roomId, -60_000);
  return { roomId, racers };
}

// Racers finish in the order given, one second apart, without errors.
function finishesInOrder(racers: readonly Racer[]): RacerFinish[] {
  return racers.map((racer, index) => ({ trainerName: racer.name, elapsedMs: 20_000 + index * 1000, rejectedKeystrokes: 0 }));
}

async function readGrantOf(roomId: RoomId, guestId: GuestId): Promise<StoredGrant | undefined> {
  const rows = await withTestDatabase(
    (sql) => sql`
      select xp, dex_before, level_before, xp_before, dex_after, level_after, xp_after from xp_grants
      where guest_id = ${guestId} and race_id = (select id from races where room_id = ${roomId} order by created_at desc limit 1)`,
  );
  return rows.map((row) => ({
    xp: row.xp as number,
    dexBefore: row.dex_before as number,
    levelBefore: row.level_before as number,
    xpBefore: row.xp_before as number,
    dexAfter: row.dex_after as number,
    levelAfter: row.level_after as number,
    xpAfter: row.xp_after as number,
  }))[0];
}

async function partnerOf(guestId: GuestId): Promise<OwnedRow> {
  return (await readCollectionOf(guestId)).find((pokemon) => pokemon.isPartner)!;
}

async function abandon(guestId: GuestId): Promise<void> {
  await withTestDatabase((sql) => sql`update race_participants set abandoned_at = now() where guest_id = ${guestId}`);
}

test.describe('race XP', () => {
  test('in a race of two the winner earns 150 XP and the last 50, each to the Pokémon raced with, recorded once in the ledger', async ({ database }) => {
    const { roomId, racers } = await raceWith(database, [{ dex: 4 }, { dex: 7 }]);
    const [winner, last] = racers;
    await finishRaceInDatabase(roomId, finishesInOrder(racers));

    expect(await readGrantOf(roomId, winner!.id)).toEqual({ xp: 150, dexBefore: 4, levelBefore: 1, xpBefore: 0, dexAfter: 4, levelAfter: 3, xpAfter: 20 });
    expect(await readGrantOf(roomId, last!.id)).toEqual({ xp: 50, dexBefore: 7, levelBefore: 1, xpBefore: 0, dexAfter: 7, levelAfter: 1, xpAfter: 50 });
    expect(await readCollectionOf(winner!.id)).toEqual([{ dex: 4, level: 3, xp: 20, isPartner: true }]);
  });

  test('in a race of eight XP falls from 150 to 50 by place', async ({ database }) => {
    const { roomId, racers } = await raceWith(database, Array.from({ length: 8 }, () => ({ dex: 1 })));
    await finishRaceInDatabase(roomId, finishesInOrder(racers));
    const earned = await Promise.all(racers.map(async (racer) => (await readGrantOf(roomId, racer.id))!.xp));
    expect(earned).toEqual([150, 136, 121, 107, 93, 79, 64, 50]);
  });

  test('tied racers share the better place and its XP', async ({ database }) => {
    const { roomId, racers } = await raceWith(database, [{ dex: 1 }, { dex: 4 }, { dex: 7 }]);
    const [first, second, third] = racers;
    await finishRaceInDatabase(roomId, [
      { trainerName: first!.name, elapsedMs: 20_000, rejectedKeystrokes: 0 },
      { trainerName: second!.name, elapsedMs: 20_000, rejectedKeystrokes: 0 },
      { trainerName: third!.name, elapsedMs: 30_000, rejectedKeystrokes: 0 },
    ]);
    expect((await readGrantOf(roomId, first!.id))!.xp).toBe(150);
    expect((await readGrantOf(roomId, second!.id))!.xp).toBe(150);
    expect((await readGrantOf(roomId, third!.id))!.xp).toBe(50);
  });

  test('an abandoner earns 0 XP and still counts in the field', async ({ database }) => {
    const { roomId, racers } = await raceWith(database, [{ dex: 4 }, { dex: 7 }]);
    const [finisher, quitter] = racers;
    await abandon(quitter!.id);
    await finishRaceInDatabase(roomId, finishesInOrder([finisher!]));
    expect((await readGrantOf(roomId, finisher!.id))!.xp).toBe(150);
    expect(await readGrantOf(roomId, quitter!.id)).toMatchObject({ xp: 0, levelAfter: 1, xpAfter: 0 });
    expect(await partnerOf(quitter!.id)).toEqual({ dex: 7, level: 1, xp: 0, isPartner: true });
  });

  test('one race can raise several levels and stops at level 99 without keeping extra XP', async ({ database }) => {
    const { roomId, racers } = await raceWith(database, [{ dex: 4, level: 98, xp: 1000 }, { dex: 7, level: 99 }]);
    const [nearMax, atMax] = racers;
    await finishRaceInDatabase(roomId, finishesInOrder(racers));
    expect(await partnerOf(nearMax!.id)).toMatchObject({ level: 99, xp: 0 });
    expect(await readGrantOf(roomId, atMax!.id)).toMatchObject({ xp: 50, levelBefore: 99, levelAfter: 99, xpAfter: 0 });
  });

  test('a Pokémon evolves when it reaches its evolution level, keeping its level, XP and partner place', async ({ database }) => {
    const { roomId, racers } = await raceWith(database, [{ dex: 1, level: 15, xp: 150 }, { dex: 4, level: 14 }]);
    const [evolving, notYet] = racers;
    await finishRaceInDatabase(roomId, finishesInOrder(racers));
    expect(await readGrantOf(roomId, evolving!.id)).toMatchObject({ dexBefore: 1, levelBefore: 15, dexAfter: 2, levelAfter: 16, xpAfter: 100 });
    expect(await readCollectionOf(evolving!.id)).toEqual([{ dex: 2, level: 16, xp: 100, isPartner: true }]);
    expect(await partnerOf(notYet!.id)).toEqual({ dex: 4, level: 14, xp: 50, isPartner: true });
  });

  test('Dragonair evolves into Dragonite at level 55, above the old cap', async ({ database }) => {
    const { roomId, racers } = await raceWith(database, [{ dex: 148, level: 54, xp: 500 }, { dex: 7, level: 1 }]);
    await finishRaceInDatabase(roomId, finishesInOrder(racers));
    expect(await partnerOf(racers[0]!.id)).toMatchObject({ dex: 149, level: 55, xp: 60 });
  });

  test('stone and trade evolutions never happen, even at level 50', async ({ database }) => {
    const { roomId, racers } = await raceWith(database, [{ dex: 25, level: 49, xp: 500 }, { dex: 64, level: 49, xp: 500 }]);
    await finishRaceInDatabase(roomId, finishesInOrder(racers));
    expect(await partnerOf(racers[0]!.id)).toMatchObject({ dex: 25, level: 50 });
    expect(await partnerOf(racers[1]!.id)).toMatchObject({ dex: 64, level: 50 });
  });

  test('XP goes to the Pokémon that started the race, even after a partner change during it', async ({ database }) => {
    const { roomId, racers } = await raceWith(database, [{ dex: 4 }, { dex: 7 }]);
    const [switcher] = racers;
    await givePokemon(switcher!.id, 25, 1);
    await choosePartner(database, switcher!.id, 25);
    await finishRaceInDatabase(roomId, finishesInOrder(racers));
    expect(await readCollectionOf(switcher!.id)).toEqual([
      { dex: 4, level: 3, xp: 20, isPartner: false },
      { dex: 25, level: 1, xp: 0, isPartner: true },
    ]);
  });

  test('concurrent settlements and a repeated grant give XP exactly once', async ({ database }) => {
    const { roomId, racers } = await raceWith(database, [{ dex: 4 }, { dex: 7 }]);
    const race = (await findCurrentRace(database, roomId))!;
    const settle = () =>
      database.transaction(async (transaction) => {
        await lockRoom(transaction, roomId);
        return settleRace(transaction, { roomId, race, endedAt: new Date() });
      });
    expect((await Promise.all([settle(), settle()])).sort()).toEqual([false, true]);
    const replayedField = [
      { guestId: racers[0]!.id, partnerDex: 4 as const, place: 1 },
      { guestId: racers[1]!.id, partnerDex: 7 as const, place: 2 },
    ];
    await database.transaction((transaction) => grantRaceXp(transaction, race.id, replayedField));
    const counts = await withTestDatabase((sql) => sql`select count(*)::int as total from xp_grants where race_id = ${race.id}`);
    expect(counts[0]!.total).toBe(2);
    expect(await partnerOf(racers[0]!.id)).toMatchObject({ level: 3, xp: 20 });
    expect(await partnerOf(racers[1]!.id)).toMatchObject({ level: 3, xp: 20 });
  });

  test('a field of one racer grants nothing', async ({ database }) => {
    const { roomId, racers } = await raceWith(database, [{ dex: 4 }, { dex: 7 }]);
    const race = (await findCurrentRace(database, roomId))!;
    await database.transaction((transaction) => grantRaceXp(transaction, race.id, [{ guestId: racers[0]!.id, partnerDex: 4, place: 1 }]));
    expect(await readGrantOf(roomId, racers[0]!.id)).toBeUndefined();
    expect(await partnerOf(racers[0]!.id)).toMatchObject({ level: 1, xp: 0 });
  });
});

test.describe('reading the XP reward', () => {
  test('each racer reads their own grant with the results, the same on every read and on the past race page', async ({ database }) => {
    const { roomId, racers } = await raceWith(database, [{ dex: 1, level: 15, xp: 150 }, { dex: 7 }]);
    const [evolving, other] = racers;
    await finishRaceInDatabase(roomId, finishesInOrder(racers));
    const expected = { xp: 150, before: { species: 'bulbasaur', level: 15, xp: 150 }, after: { species: 'ivysaur', level: 16, xp: 100 } };

    const readReward = async (guestId: GuestId) => {
      const found = await findRoomSnapshot(database, roomId, guestId);
      return found.kind === 'snapshot' ? found.snapshot.race?.reward : 'no snapshot';
    };
    expect(await readReward(evolving!.id)).toEqual(expected);
    expect(await readReward(evolving!.id)).toEqual(expected);
    expect(await readReward(other!.id)).toEqual({ xp: 50, before: { species: 'squirtle', level: 1, xp: 0 }, after: { species: 'squirtle', level: 1, xp: 50 } });
    const race = (await findCurrentRace(database, roomId))!;
    expect((await findPastRaceResults(database, { roomId, raceId: race.id, viewerGuestId: evolving!.id }))!.reward).toEqual(expected);
  });

  test('no reward shows before the race settles', async ({ database }) => {
    const { roomId, racers } = await raceWith(database, [{ dex: 4 }, { dex: 7 }]);
    const found = await findRoomSnapshot(database, roomId, racers[0]!.id);
    expect(found.kind === 'snapshot' && found.snapshot.race?.reward).toBeNull();
  });

  test('the hub lists the XP of each recent race and the Pokédex keeps the evolved-from form caught', async ({ database }) => {
    const { roomId, racers } = await raceWith(database, [{ dex: 1, level: 15, xp: 150 }, { dex: 7 }]);
    await finishRaceInDatabase(roomId, finishesInOrder(racers));
    const profile = await loadTrainerProfile(database, racers[0]!.id);
    expect(profile.recentRaces.map((race) => race.xp)).toEqual([150]);
    expect(profile.collection.map((pokemon) => pokemon.dex)).toEqual([2]);
    expect(profile.caughtDexes).toEqual([1, 2]);
  });
});
