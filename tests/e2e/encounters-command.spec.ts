import { randomUUID } from 'node:crypto';
import { playersOnlyField } from '../../src/domain/race-reward';
import { expect } from '@playwright/test';
import type { GuestId } from '../../src/domain/guest-id';
import type { RoomId } from '../../src/domain/room-id';
import type { RandomSource } from '../../src/domain/random-source';
import { rarityOf, wildDexes } from '../../src/domain/wild-encounter';
import type { PokedexDex } from '../../src/assets/pokedex';
import type { Database } from '../../src/server/db/types';
import { grantRaceEncounters } from '../../src/server/encounters/grant-encounters';
import { letEncounterGo } from '../../src/server/encounters/let-encounter-go';
import { throwBall } from '../../src/server/encounters/throw-ball';
import { findPastRaceResults } from '../../src/server/rooms/past-race-results';
import { findCurrentRace } from '../../src/server/rooms/race-rows';
import { openRoom } from '../../src/server/rooms/room-commands';
import { findRoomSnapshot } from '../../src/server/rooms/room-snapshot';
import { buyItem } from '../../src/server/shop/buy-item';
import { releasePokemon } from '../../src/server/trainer/release-pokemon';
import { loadTrainerProfile } from '../../src/server/trainer/trainer-profile';
import { commandTest as test, insertGuest, joinRoomNow } from './support/commands';
import { ballsOf, countOwnedOfSpecies, fillCollectionTo, giveBalls, insertWaitingEncounter, pcBoxesOf, readEncountersOf, readLegendariesOf } from './support/encounters';
import { uniqueName, withTestDatabase } from './support/guests';
import { startRaceInDatabase } from './support/rooms';
import { finishRaceInDatabase } from './support/settlement';
import { givePokemon, insertFinishedRaces, readCollectionOf } from './support/trainer';

type Racer = { id: GuestId; name: string };

const alwaysCatches: RandomSource = () => 0;
const neverCatches: RandomSource = () => 0.999;

async function newRacer(): Promise<Racer> {
  const name = uniqueName('Racer ');
  const id = await insertGuest(name);
  await withTestDatabase((sql) => sql`insert into owned_pokemon (guest_id, dex, level, is_partner) values (${id}, 4, 1, true)`);
  return { id, name };
}

async function raceOf(database: Database, racers: readonly Racer[]): Promise<RoomId> {
  const roomId = await openRoom(database, { hostGuestId: racers[0]!.id, visibility: 'unlisted', openedAt: new Date() });
  for (const racer of racers.slice(1)) await joinRoomNow(database, roomId, racer.id);
  await startRaceInDatabase(roomId, -60_000);
  return roomId;
}

async function finishInOrder(roomId: RoomId, racers: readonly Racer[]): Promise<void> {
  await finishRaceInDatabase(roomId, racers.map((racer, index) => ({ trainerName: racer.name, elapsedMs: 20_000 + index * 1000, rejectedKeystrokes: 0 })));
}

async function coinsOf(guestId: GuestId): Promise<number> {
  const [row] = await withTestDatabase((sql) => sql`select coins from guests where id = ${guestId}`);
  return row!.coins as number;
}

async function trainerWithEncounter(balls: number, dex = 19): Promise<{ guestId: GuestId; encounterId: string }> {
  const { id: guestId } = await newRacer();
  await giveBalls(guestId, balls);
  return { guestId, encounterId: await insertWaitingEncounter(guestId, { dex, level: 4 }) };
}

test.describe('who meets a wild Pokémon after a race', () => {
  test('the first three of a race of five always get one encounter each, recorded once per racer', async ({ database }) => {
    const racers = await Promise.all(Array.from({ length: 5 }, newRacer));
    const roomId = await raceOf(database, racers);
    await finishInOrder(roomId, racers);
    for (const racer of racers.slice(0, 3)) expect(await readEncountersOf(racer.id)).toHaveLength(1);
    for (const racer of racers.slice(3)) expect((await readEncountersOf(racer.id)).length).toBeLessThanOrEqual(1);
  });

  test('every other ranked racer gets one only when the 10% roll wins, and an abandoner never does', async ({ database }) => {
    const racers = await Promise.all(Array.from({ length: 4 }, newRacer));
    const race = (await findCurrentRace(database, await raceOf(database, racers)))!;
    const field = [{ guestId: racers[0]!.id, place: 4 }, { guestId: racers[1]!.id, place: 5 }, { guestId: racers[2]!.id, place: null }, { guestId: racers[3]!.id, place: 6 }];
    const rolls = [0.05, 0.5, 0.0999, 0, 0, 0, 0, 0, 0];
    await database.transaction((transaction) => grantRaceEncounters(transaction, race.id, playersOnlyField(field), () => rolls.shift() ?? 0.9));
    expect(await Promise.all(racers.map(async (racer) => (await readEncountersOf(racer.id)).length))).toEqual([1, 0, 0, 1]);
  });

  test('an encounter is a base form, never a Kanto legendary, at level 1 to 5, and repeating the grant adds nothing', async ({ database }) => {
    const racers = await Promise.all(Array.from({ length: 3 }, newRacer));
    const roomId = await raceOf(database, racers);
    await finishInOrder(roomId, racers);
    const race = (await findCurrentRace(database, roomId))!;
    await database.transaction((transaction) => grantRaceEncounters(transaction, race.id, playersOnlyField(racers.map((racer, index) => ({ guestId: racer.id, place: index + 1 })))));
    for (const racer of racers) {
      const [encounter, ...others] = await readEncountersOf(racer.id);
      expect(others).toEqual([]);
      expect(wildDexes).toContain(encounter!.dex);
      expect([144, 145, 146, 150, 151]).not.toContain(encounter!.dex);
      expect(encounter!.level).toBeGreaterThanOrEqual(1);
      expect(encounter!.level).toBeLessThanOrEqual(5);
      expect(encounter).toMatchObject({ throwsUsed: 0, status: 'waiting' });
    }
  });

  test('a race can put a Pokémon of a new region or a new-region legendary in the queue', async ({ database }) => {
    const racers = await Promise.all(Array.from({ length: 2 }, newRacer));
    const race = (await findCurrentRace(database, await raceOf(database, racers)))!;
    const lastCommonRoll = 0.99;
    const legendaryRoll = 0.999;
    const rolls = [lastCommonRoll * (60 / 101), lastCommonRoll, 0, legendaryRoll, 0, 0];
    const field = racers.map((racer, index) => ({ guestId: racer.id, place: index + 1 }));
    await database.transaction((transaction) => grantRaceEncounters(transaction, race.id, playersOnlyField(field), () => rolls.shift() ?? 0));
    const [common] = await readEncountersOf(racers[0]!.id);
    const [legendary] = await readEncountersOf(racers[1]!.id);
    expect(common!.dex).toBeGreaterThan(151);
    expect(rarityOf(common!.dex as PokedexDex)).toBe('common');
    expect(legendary!.dex).toBeGreaterThan(151);
    expect(rarityOf(legendary!.dex as PokedexDex)).toBe('legendary');
  });

  test('a field of one racer meets nothing', async ({ database }) => {
    const racers = await Promise.all(Array.from({ length: 2 }, newRacer));
    const race = (await findCurrentRace(database, await raceOf(database, racers)))!;
    await database.transaction((transaction) => grantRaceEncounters(transaction, race.id, playersOnlyField([{ guestId: racers[0]!.id, place: 1 }]), alwaysCatches));
    expect(await readEncountersOf(racers[0]!.id)).toEqual([]);
  });

  test('a queue of ten waiting encounters drops the new one', async ({ database }) => {
    const racers = await Promise.all(Array.from({ length: 2 }, newRacer));
    for (let index = 0; index < 10; index += 1) await insertWaitingEncounter(racers[0]!.id);
    const roomId = await raceOf(database, racers);
    await finishInOrder(roomId, racers);
    expect(await readEncountersOf(racers[0]!.id)).toHaveLength(10);
    expect(await readEncountersOf(racers[1]!.id)).toHaveLength(1);
  });

  test('the results show the viewer their own encounter, read again the same on every refresh', async ({ database }) => {
    const racers = await Promise.all(Array.from({ length: 2 }, newRacer));
    const roomId = await raceOf(database, racers);
    await finishInOrder(roomId, racers);
    const [stored] = await readEncountersOf(racers[1]!.id);
    const found = await findRoomSnapshot(database, roomId, racers[1]!.id);
    const encounter = found.kind === 'snapshot' ? found.snapshot.race?.encounter : null;
    expect(encounter).toMatchObject({ level: stored!.level, status: 'waiting' });
    const race = (await findCurrentRace(database, roomId))!;
    expect((await findPastRaceResults(database, { roomId, raceId: race.id, viewerGuestId: racers[1]!.id }))!.encounter).toEqual(encounter);
  });
});

test.describe('throwing Poké Balls', () => {
  test('a catch spends one ball and adds the Pokémon at its level with 0 XP, paying no XP and no Poké Dollars', async ({ database }) => {
    const { guestId, encounterId } = await trainerWithEncounter(5);
    expect(await throwBall(database, { guestId, encounterId, throwNumber: 1 }, alwaysCatches)).toEqual({ outcome: 'caught', dex: 19 });
    expect(await ballsOf(guestId)).toBe(4);
    expect(await readCollectionOf(guestId)).toEqual([{ dex: 4, level: 1, xp: 0, isPartner: true }, { dex: 19, level: 4, xp: 0, isPartner: false }]);
    expect(await coinsOf(guestId)).toBe(0);
    expect((await readEncountersOf(guestId))[0]).toMatchObject({ throwsUsed: 1, status: 'caught' });
  });

  test('each throw spends one ball, and after three misses the Pokémon flees', async ({ database }) => {
    const { guestId, encounterId } = await trainerWithEncounter(5);
    expect(await throwBall(database, { guestId, encounterId, throwNumber: 1 }, neverCatches)).toEqual({ outcome: 'missed', dex: 19, throwsLeft: 2 });
    expect(await throwBall(database, { guestId, encounterId, throwNumber: 2 }, neverCatches)).toEqual({ outcome: 'missed', dex: 19, throwsLeft: 1 });
    expect(await throwBall(database, { guestId, encounterId, throwNumber: 3 }, neverCatches)).toEqual({ outcome: 'fled', dex: 19 });
    expect(await throwBall(database, { guestId, encounterId, throwNumber: 4 }, alwaysCatches)).toEqual({ outcome: 'gone' });
    expect(await ballsOf(guestId)).toBe(2);
    expect(await countOwnedOfSpecies(guestId, 19)).toBe(0);
    expect((await readEncountersOf(guestId))[0]).toMatchObject({ throwsUsed: 3, status: 'fled' });
  });

  test('a new-region legendary allows exactly one throw at 5%: a miss lets it flee and spends one ball', async ({ database }) => {
    const missed = await trainerWithEncounter(3, 249);
    expect(await throwBall(database, { ...missed, throwNumber: 1 }, () => 0.05)).toEqual({ outcome: 'fled', dex: 249 });
    expect(await throwBall(database, { ...missed, throwNumber: 2 }, alwaysCatches)).toEqual({ outcome: 'gone' });
    expect(await ballsOf(missed.guestId)).toBe(2);
    expect(await countOwnedOfSpecies(missed.guestId, 249)).toBe(0);
    expect((await readEncountersOf(missed.guestId))[0]).toMatchObject({ throwsUsed: 1, status: 'fled' });
    const caught = await trainerWithEncounter(1, 249);
    expect(await throwBall(database, { ...caught, throwNumber: 1 }, () => 0.049)).toEqual({ outcome: 'caught', dex: 249 });
    expect(await countOwnedOfSpecies(caught.guestId, 249)).toBe(1);
  });

  for (const [dex, tier, below, at] of [[19, 'common', 0.69, 0.7], [25, 'uncommon', 0.44, 0.45], [147, 'rare', 0.19, 0.2]] as const) {
    test(`a ${tier} Pokémon is caught only when the roll is under its catch rate`, async ({ database }) => {
      const missed = await trainerWithEncounter(1, dex);
      expect((await throwBall(database, { ...missed, throwNumber: 1 }, () => at)).outcome).toBe('missed');
      const caught = await trainerWithEncounter(1, dex);
      expect((await throwBall(database, { ...caught, throwNumber: 1 }, () => below)).outcome).toBe('caught');
    });
  }

  test('a double click sends the same throw twice: one ball is spent and both answers agree', async ({ database }) => {
    const { guestId, encounterId } = await trainerWithEncounter(5);
    const results = await Promise.all([throwBall(database, { guestId, encounterId, throwNumber: 1 }, neverCatches), throwBall(database, { guestId, encounterId, throwNumber: 1 }, alwaysCatches)]);
    expect(results).toEqual([results[0], results[0]]);
    expect(await ballsOf(guestId)).toBe(4);
    expect((await readEncountersOf(guestId))[0]!.throwsUsed).toBe(1);
  });

  test('without a ball the throw is refused and the encounter keeps waiting', async ({ database }) => {
    const { guestId, encounterId } = await trainerWithEncounter(0);
    expect(await throwBall(database, { guestId, encounterId, throwNumber: 1 }, alwaysCatches)).toEqual({ outcome: 'no-ball' });
    expect((await readEncountersOf(guestId))[0]).toMatchObject({ throwsUsed: 0, status: 'waiting' });
  });

  test('a full PC refuses the throw, spends no ball, and the encounter waits until a box is bought', async ({ database }) => {
    const { guestId, encounterId } = await trainerWithEncounter(3);
    await fillCollectionTo(guestId, 30);
    expect(await throwBall(database, { guestId, encounterId, throwNumber: 1 }, alwaysCatches)).toEqual({ outcome: 'pc-full' });
    expect(await ballsOf(guestId)).toBe(3);
    await withTestDatabase((sql) => sql`update guests set coins = 250 where id = ${guestId}`);
    expect(await buyItem(database, { guestId, item: 'pc-box', quantity: 1, purchaseKey: randomUUID() })).toBe('bought');
    expect(await pcBoxesOf(guestId)).toBe(2);
    expect(await coinsOf(guestId)).toBe(50);
    expect((await loadTrainerProfile(database, guestId)).bag).toEqual([{ item: 'poke-ball', quantity: 3 }]);
    expect((await throwBall(database, { guestId, encounterId, throwNumber: 1 }, alwaysCatches)).outcome).toBe('caught');
  });

  test('a trainer can catch a species they already own', async ({ database }) => {
    const { guestId, encounterId } = await trainerWithEncounter(1, 4);
    expect((await throwBall(database, { guestId, encounterId, throwNumber: 1 }, alwaysCatches)).outcome).toBe('caught');
    expect(await countOwnedOfSpecies(guestId, 4)).toBe(2);
  });

  test("nobody can throw at another trainer's encounter or replay a throw that never happened", async ({ database }) => {
    const { guestId, encounterId } = await trainerWithEncounter(3);
    const stranger = await newRacer();
    await giveBalls(stranger.id, 3);
    expect(await throwBall(database, { guestId: stranger.id, encounterId, throwNumber: 1 }, alwaysCatches)).toEqual({ outcome: 'gone' });
    expect(await throwBall(database, { guestId, encounterId, throwNumber: 2 }, alwaysCatches)).toEqual({ outcome: 'gone' });
    expect(await ballsOf(stranger.id)).toBe(3);
    expect(await ballsOf(guestId)).toBe(3);
  });

  test('letting a Pokémon go closes the encounter for good', async ({ database }) => {
    const { guestId, encounterId } = await trainerWithEncounter(3);
    expect(await letEncounterGo(database, guestId, encounterId)).toBe('let-go');
    expect(await letEncounterGo(database, guestId, encounterId)).toBe('gone');
    expect(await throwBall(database, { guestId, encounterId, throwNumber: 1 }, alwaysCatches)).toEqual({ outcome: 'gone' });
    expect((await loadTrainerProfile(database, guestId)).encounters).toEqual([]);
  });
});

test.describe('releasing a Pokémon', () => {
  test('frees its place, never touches the partner or another trainer, and the Pokédex keeps the species', async ({ database }) => {
    const { id: guestId } = await newRacer();
    const pikachu = await givePokemon(guestId, 25, 7);
    const [partner] = await withTestDatabase((sql) => sql`select id from owned_pokemon where guest_id = ${guestId} and is_partner`);
    const stranger = await newRacer();
    expect(await releasePokemon(database, { guestId, pokemonId: partner!.id as string })).toBe('partner');
    expect(await releasePokemon(database, { guestId: stranger.id, pokemonId: pikachu })).toBe('not-owned');
    expect(await releasePokemon(database, { guestId, pokemonId: pikachu })).toBe('released');
    expect(await releasePokemon(database, { guestId, pokemonId: pikachu })).toBe('not-owned');
    expect((await readCollectionOf(guestId)).map((pokemon) => pokemon.dex)).toEqual([4]);
    expect((await loadTrainerProfile(database, guestId)).caughtDexes).toEqual([4, 25]);
  });
});

test.describe('Kanto legendaries', () => {
  test('releasing a legendary is refused without the explicit confirmation and works with it', async ({ database }) => {
    const { guestId } = await newRacer().then((racer) => ({ guestId: racer.id }));
    const articuno = await givePokemon(guestId, 144, 5);
    expect(await releasePokemon(database, { guestId, pokemonId: articuno })).toBe('legendary-unconfirmed');
    expect(await countOwnedOfSpecies(guestId, 144)).toBe(1);
    expect(await releasePokemon(database, { guestId, pokemonId: articuno, isLegendaryConfirmed: true })).toBe('released');
    expect(await countOwnedOfSpecies(guestId, 144)).toBe(0);
  });

  async function veteranRace(database: Database, finishedBefore: number): Promise<{ roomId: RoomId; veteran: Racer; rival: Racer }> {
    const [veteran, rival] = await Promise.all([newRacer(), newRacer()]);
    const pastRoom = await openRoom(database, { hostGuestId: veteran!.id, visibility: 'unlisted', openedAt: new Date() });
    await insertFinishedRaces(veteran!.id, pastRoom, finishedBefore);
    return { roomId: await raceOf(database, [veteran!, rival!]), veteran: veteran!, rival: rival! };
  }

  test('Articuno joins at level 5, once, at the race that meets its goals, and the results announce it', async ({ database }) => {
    const { roomId, veteran, rival } = await veteranRace(database, 49);
    await finishInOrder(roomId, [veteran, rival]);
    expect(await readLegendariesOf(veteran.id)).toEqual([{ dex: 144, isClaimed: true }]);
    expect((await readCollectionOf(veteran.id)).filter((pokemon) => pokemon.dex === 144)).toEqual([{ dex: 144, level: 5, xp: 0, isPartner: false }]);
    expect(await readLegendariesOf(rival.id)).toEqual([]);
    const found = await findRoomSnapshot(database, roomId, veteran.id);
    expect(found.kind === 'snapshot' && found.snapshot.race?.legendaries).toEqual([{ species: 'articuno', isWaiting: false }]);

    const next = await raceOf(database, [veteran, rival]);
    await finishInOrder(next, [veteran, rival]);
    expect(await countOwnedOfSpecies(veteran.id, 144)).toBe(1);
  });

  test('one goal short grants nothing', async ({ database }) => {
    const { roomId, veteran, rival } = await veteranRace(database, 48);
    await finishInOrder(roomId, [veteran, rival]);
    expect(await readLegendariesOf(veteran.id)).toEqual([]);
    expect(await countOwnedOfSpecies(veteran.id, 144)).toBe(0);
  });

  test('a full PC keeps the earned legendary waiting, then a freed place receives it exactly once', async ({ database }) => {
    const { roomId, veteran, rival } = await veteranRace(database, 49);
    await fillCollectionTo(veteran.id, 30);
    await finishInOrder(roomId, [veteran, rival]);
    expect(await readLegendariesOf(veteran.id)).toEqual([{ dex: 144, isClaimed: false }]);
    expect(await countOwnedOfSpecies(veteran.id, 144)).toBe(0);
    const found = await findRoomSnapshot(database, roomId, veteran.id);
    expect(found.kind === 'snapshot' && found.snapshot.race?.legendaries).toEqual([{ species: 'articuno', isWaiting: true }]);
    expect((await loadTrainerProfile(database, veteran.id)).legendaries).toEqual([{ dex: 144, isWaiting: true }]);

    const [rattata] = await withTestDatabase((sql) => sql`select id from owned_pokemon where guest_id = ${veteran.id} and dex = 19 limit 1`);
    expect(await releasePokemon(database, { guestId: veteran.id, pokemonId: rattata!.id as string })).toBe('released');
    expect(await readLegendariesOf(veteran.id)).toEqual([{ dex: 144, isClaimed: true }]);
    expect(await countOwnedOfSpecies(veteran.id, 144)).toBe(1);

    await withTestDatabase((sql) => sql`update guests set coins = 200 where id = ${veteran.id}`);
    await buyItem(database, { guestId: veteran.id, item: 'pc-box', quantity: 1, purchaseKey: randomUUID() });
    expect(await countOwnedOfSpecies(veteran.id, 144)).toBe(1);
  });

  test('buying a box places a waiting legendary', async ({ database }) => {
    const { roomId, veteran, rival } = await veteranRace(database, 49);
    await fillCollectionTo(veteran.id, 30);
    await finishInOrder(roomId, [veteran, rival]);
    await withTestDatabase((sql) => sql`update guests set coins = 200 where id = ${veteran.id}`);
    expect(await buyItem(database, { guestId: veteran.id, item: 'pc-box', quantity: 1, purchaseKey: randomUUID() })).toBe('bought');
    expect(await readLegendariesOf(veteran.id)).toEqual([{ dex: 144, isClaimed: true }]);
    expect(await countOwnedOfSpecies(veteran.id, 144)).toBe(1);
  });
});
