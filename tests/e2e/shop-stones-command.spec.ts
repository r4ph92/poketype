import { randomBytes, randomUUID } from 'node:crypto';
import { playersOnlyField } from '../../src/domain/race-reward';
import { expect } from '@playwright/test';
import type { PokedexDex } from '../../src/assets/pokedex';
import type { GuestId } from '../../src/domain/guest-id';
import type { RoomId } from '../../src/domain/room-id';
import type { EvolutionItemId, ShopItemId } from '../../src/domain/shop-item';
import { openAccount } from '../../src/server/accounts/account-commands';
import type { Database } from '../../src/server/db/types';
import { findPastRaceResults } from '../../src/server/rooms/past-race-results';
import { findCurrentRace } from '../../src/server/rooms/race-rows';
import { openRoom } from '../../src/server/rooms/room-commands';
import { lockRoom } from '../../src/server/rooms/room-rows';
import { findRoomSnapshot } from '../../src/server/rooms/room-snapshot';
import { settleRace } from '../../src/server/rooms/settle-race';
import { hashSessionToken } from '../../src/server/sessions/session-token';
import { buyItem } from '../../src/server/shop/buy-item';
import { findWallet } from '../../src/server/shop/wallet';
import { evolveWithItem } from '../../src/server/trainer/evolve-with-item';
import { grantRaceCoins } from '../../src/server/trainer/grant-race-coins';
import { loadTrainerProfile } from '../../src/server/trainer/trainer-profile';
import { uniqueUsername } from './support/accounts';
import { commandTest as test, insertGuest, joinRoomNow } from './support/commands';
import { uniqueName, withTestDatabase } from './support/guests';
import { startRaceInDatabase } from './support/rooms';
import { finishRaceInDatabase } from './support/settlement';
import { givePokemon, insertFinishedRaces, readCollectionOf } from './support/trainer';

type Racer = { id: GuestId; name: string };

const scryptShapedHash = '$scrypt$ln=16,r=8,p=2$c2FsdA$aGFzaA';

async function newRacer(): Promise<Racer> {
  const name = uniqueName('Racer ');
  const id = await insertGuest(name);
  await withTestDatabase((sql) => sql`insert into owned_pokemon (guest_id, dex, level, is_partner) values (${id}, 4, 1, true)`);
  return { id, name };
}

// Every racer joins one room whose race started a minute ago.
async function raceOf(database: Database, count: number): Promise<{ roomId: RoomId; racers: Racer[] }> {
  const racers = await Promise.all(Array.from({ length: count }, newRacer));
  const roomId = await openRoom(database, { hostGuestId: racers[0]!.id, visibility: 'unlisted', openedAt: new Date() });
  for (const racer of racers.slice(1)) await joinRoomNow(database, roomId, racer.id);
  await startRaceInDatabase(roomId, -60_000);
  return { roomId, racers };
}

async function finishInOrder(roomId: RoomId, racers: readonly Racer[]): Promise<void> {
  await finishRaceInDatabase(roomId, racers.map((racer, index) => ({ trainerName: racer.name, elapsedMs: 20_000 + index * 1000, rejectedKeystrokes: 0 })));
}

async function coinsOf(guestId: GuestId): Promise<number> {
  const [row] = await withTestDatabase((sql) => sql`select coins from guests where id = ${guestId}`);
  return row!.coins as number;
}

async function setCoins(guestId: GuestId, coins: number): Promise<void> {
  await withTestDatabase((sql) => sql`update guests set coins = ${coins} where id = ${guestId}`);
}

async function giveItem(guestId: GuestId, item: ShopItemId, quantity: number): Promise<void> {
  await withTestDatabase((sql) => sql`insert into bag_items (guest_id, item, quantity) values (${guestId}, ${item}, ${quantity})`);
}

async function quantityOf(guestId: GuestId, item: ShopItemId): Promise<number> {
  const [row] = await withTestDatabase((sql) => sql`select quantity from bag_items where guest_id = ${guestId} and item = ${item}`);
  return (row?.quantity as number | undefined) ?? 0;
}

async function countEntries(guestId: GuestId, reason: string): Promise<number> {
  const [row] = await withTestDatabase((sql) => sql`select count(*)::int as total from coin_entries where guest_id = ${guestId} and reason = ${reason}`);
  return row!.total as number;
}

type StoneTrainer = { guestId: GuestId; pokemonIds: string[] };

async function trainerWith(dexes: readonly PokedexDex[], stones: readonly EvolutionItemId[] = []): Promise<StoneTrainer> {
  const guestId = await insertGuest(uniqueName('Trainer '));
  const pokemonIds: string[] = [];
  for (const dex of dexes) pokemonIds.push(await givePokemon(guestId, dex, 20));
  for (const stone of stones) await giveItem(guestId, stone, 1);
  return { guestId, pokemonIds };
}

test.describe('race Poké Dollars', () => {
  test('in a race of three the winner earns 200 ₽, the second 150 ₽ and the last 100 ₽, recorded once per racer', async ({ database }) => {
    const { roomId, racers } = await raceOf(database, 3);
    await finishInOrder(roomId, racers);
    expect(await Promise.all(racers.map((racer) => coinsOf(racer.id)))).toEqual([200 + 500, 150 + 500, 100 + 500]);
    for (const racer of racers) expect(await countEntries(racer.id, 'race')).toBe(1);
  });

  test('an abandoner earns 0 ₽ and still counts in the field', async ({ database }) => {
    const { roomId, racers } = await raceOf(database, 2);
    const [finisher, quitter] = racers;
    await withTestDatabase((sql) => sql`update race_participants set abandoned_at = now() where guest_id = ${quitter!.id}`);
    await finishInOrder(roomId, [finisher!]);
    expect(await coinsOf(finisher!.id)).toBe(200 + 500);
    expect(await coinsOf(quitter!.id)).toBe(0);
    const found = await findRoomSnapshot(database, roomId, quitter!.id);
    expect(found.kind === 'snapshot' && found.snapshot.race?.coins).toEqual({ race: 0, badges: 0 });
  });

  test('a field of one racer pays nothing', async ({ database }) => {
    const { roomId, racers } = await raceOf(database, 2);
    const race = (await findCurrentRace(database, roomId))!;
    await database.transaction((transaction) => grantRaceCoins(transaction, race.id, playersOnlyField([{ guestId: racers[0]!.id, place: 1 }])));
    expect(await coinsOf(racers[0]!.id)).toBe(0);
    expect(await countEntries(racers[0]!.id, 'race')).toBe(0);
  });

  test('concurrent settlements and a repeated payout give the coins exactly once', async ({ database }) => {
    const { roomId, racers } = await raceOf(database, 2);
    const race = (await findCurrentRace(database, roomId))!;
    const settle = () =>
      database.transaction(async (transaction) => {
        await lockRoom(transaction, roomId);
        return settleRace(transaction, { roomId, race, endedAt: new Date() });
      });
    expect((await Promise.all([settle(), settle()])).sort()).toEqual([false, true]);
    await database.transaction((transaction) => grantRaceCoins(transaction, race.id, playersOnlyField(racers.map((racer) => ({ guestId: racer.id, place: 2 })))));
    expect(await Promise.all(racers.map((racer) => coinsOf(racer.id)))).toEqual([200, 200]);
    for (const racer of racers) expect(await countEntries(racer.id, 'race')).toBe(1);
  });

  test('each badge pays 500 ₽ once, with the race that earned it, and the results show the payout from the ledger', async ({ database }) => {
    const { roomId, racers } = await raceOf(database, 2);
    const [veteran, rookie] = racers;
    const pastRoom = await openRoom(database, { hostGuestId: veteran!.id, visibility: 'unlisted', openedAt: new Date() });
    await insertFinishedRaces(veteran!.id, pastRoom, 4);
    await withTestDatabase((sql) => sql`insert into earned_badges (guest_id, badge) values (${veteran!.id}, 'boulder')`);
    await finishInOrder(roomId, racers);

    expect(await coinsOf(veteran!.id)).toBe(200 + 500);
    expect(await coinsOf(rookie!.id)).toBe(100 + 500);
    const race = (await findCurrentRace(database, roomId))!;
    const readCoins = async (guestId: GuestId) => {
      const found = await findRoomSnapshot(database, roomId, guestId);
      return found.kind === 'snapshot' ? found.snapshot.race?.coins : 'no snapshot';
    };
    expect(await readCoins(veteran!.id)).toEqual({ race: 200, badges: 500 });
    expect(await readCoins(veteran!.id)).toEqual({ race: 200, badges: 500 });
    expect((await findPastRaceResults(database, { roomId, raceId: race.id, viewerGuestId: rookie!.id }))!.coins).toEqual({ race: 100, badges: 500 });
  });

  test('no payout shows before the race settles', async ({ database }) => {
    const { roomId, racers } = await raceOf(database, 2);
    const found = await findRoomSnapshot(database, roomId, racers[0]!.id);
    expect(found.kind === 'snapshot' && found.snapshot.race?.coins).toBeNull();
  });

  test('the wallet and bag follow the guest into the account opened from its session', async ({ database }) => {
    const guestId = await insertGuest(uniqueName('Maya '));
    await setCoins(guestId, 1234);
    await giveItem(guestId, 'moon-stone', 2);
    const token = randomBytes(32).toString('base64url');
    await withTestDatabase((sql) => sql`insert into sessions (token_hash, guest_id, expires_at) values (${hashSessionToken(token)}, ${guestId}, now() + interval '1 hour')`);
    const result = await openAccount(database, { username: uniqueUsername(), passwordHash: scryptShapedHash }, token);
    expect(result.outcome).toBe('opened');
    const [account] = await withTestDatabase((sql) => sql`select guest_id from users where guest_id = ${guestId}`);
    expect(account!.guest_id).toBe(guestId);
    expect(await findWallet(database, guestId)).toEqual({ coins: 1234, bag: [{ item: 'moon-stone', quantity: 2 }] });
  });
});

test.describe('buying in the shop', () => {
  test('a purchase takes the server price from the wallet and puts the items in the bag', async ({ database }) => {
    const guestId = await insertGuest(uniqueName('Buyer '));
    await setCoins(guestId, 3010);
    expect(await buyItem(database, { guestId, item: 'fire-stone', quantity: 2, purchaseKey: randomUUID() })).toBe('bought');
    expect(await buyItem(database, { guestId, item: 'poke-ball', quantity: 2, purchaseKey: randomUUID() })).toBe('bought');
    expect(await findWallet(database, guestId)).toEqual({ coins: 0, bag: [{ item: 'fire-stone', quantity: 2 }, { item: 'poke-ball', quantity: 2 }] });
  });

  test('a purchase the wallet cannot pay is refused and changes nothing', async ({ database }) => {
    const guestId = await insertGuest(uniqueName('Buyer '));
    await setCoins(guestId, 1499);
    expect(await buyItem(database, { guestId, item: 'leaf-stone', quantity: 1, purchaseKey: randomUUID() })).toBe('insufficient-funds');
    expect(await findWallet(database, guestId)).toEqual({ coins: 1499, bag: [] });
    expect(await countEntries(guestId, 'purchase')).toBe(0);
  });

  test('a double click sends the same request twice and is charged once', async ({ database }) => {
    const guestId = await insertGuest(uniqueName('Buyer '));
    await setCoins(guestId, 5000);
    const request = { guestId, item: 'water-stone' as const, quantity: 1, purchaseKey: randomUUID() };
    expect(await Promise.all([buyItem(database, request), buyItem(database, request)])).toEqual(['bought', 'bought']);
    expect(await coinsOf(guestId)).toBe(3500);
    expect(await quantityOf(guestId, 'water-stone')).toBe(1);
  });

  test('two different purchases racing for one balance never take it below zero', async ({ database }) => {
    const guestId = await insertGuest(uniqueName('Buyer '));
    await setCoins(guestId, 2000);
    const buy = () => buyItem(database, { guestId, item: 'thunder-stone', quantity: 1, purchaseKey: randomUUID() });
    expect((await Promise.all([buy(), buy()])).sort()).toEqual(['bought', 'insufficient-funds']);
    expect(await coinsOf(guestId)).toBe(500);
  });

  test('the database refuses a wallet below zero or a negative bag quantity', async () => {
    const guestId = await insertGuest(uniqueName('Buyer '));
    await expect(withTestDatabase((sql) => sql`update guests set coins = -1 where id = ${guestId}`)).rejects.toThrow(/guests_coins_check/);
    await expect(giveItem(guestId, 'poke-ball', -1)).rejects.toThrow(/bag_items_quantity_check/);
  });
});

test.describe('evolving with a stone', () => {
  test('a Thunder Stone evolves Pikachu into Raichu, keeping its level and partner place, and the Pokédex keeps Pikachu', async ({ database }) => {
    const { guestId } = await trainerWith([], ['thunder-stone']);
    const [pikachu] = await withTestDatabase((sql) => sql`insert into owned_pokemon (guest_id, dex, level, xp, is_partner) values (${guestId}, 25, 12, 40, true) returning id`);
    expect(await evolveWithItem(database, { guestId, pokemonId: pikachu!.id as string, item: 'thunder-stone' })).toEqual({ outcome: 'evolved', from: 25, into: 26 });
    expect(await readCollectionOf(guestId)).toEqual([{ dex: 26, level: 12, xp: 40, isPartner: true }]);
    expect(await quantityOf(guestId, 'thunder-stone')).toBe(0);
    expect((await loadTrainerProfile(database, guestId)).caughtDexes).toEqual([25, 26]);
  });

  test('each stone works only on its own species', async ({ database }) => {
    const { guestId, pokemonIds: [pikachu, charmander] } = await trainerWith([25, 4], ['fire-stone']);
    expect(await evolveWithItem(database, { guestId, pokemonId: pikachu!, item: 'fire-stone' })).toEqual({ outcome: 'cannot-use' });
    expect(await evolveWithItem(database, { guestId, pokemonId: charmander!, item: 'fire-stone' })).toEqual({ outcome: 'cannot-use' });
    expect(await quantityOf(guestId, 'fire-stone')).toBe(1);
  });

  test('a stone does nothing for a Pokémon the trainer does not own or without the stone in the bag', async ({ database }) => {
    const { guestId, pokemonIds: [vulpix] } = await trainerWith([37], ['moon-stone']);
    const { pokemonIds: [strangersClefairy] } = await trainerWith([35]);
    expect(await evolveWithItem(database, { guestId, pokemonId: strangersClefairy!, item: 'moon-stone' })).toEqual({ outcome: 'cannot-use' });
    expect(await evolveWithItem(database, { guestId, pokemonId: vulpix!, item: 'fire-stone' })).toEqual({ outcome: 'no-item' });
    expect(await readCollectionOf(guestId)).toEqual([{ dex: 37, level: 20, xp: 0, isPartner: false }]);
  });

  for (const [stone, into] of [['water-stone', 134], ['thunder-stone', 135], ['fire-stone', 136]] as const) {
    test(`Eevee becomes ${into} with the ${stone} the trainer chose`, async ({ database }) => {
      const { guestId, pokemonIds: [eevee] } = await trainerWith([133], ['water-stone', 'thunder-stone', 'fire-stone']);
      expect(await evolveWithItem(database, { guestId, pokemonId: eevee!, item: stone })).toEqual({ outcome: 'evolved', from: 133, into });
      expect((await readCollectionOf(guestId)).map((pokemon) => pokemon.dex)).toEqual([into]);
      expect(await quantityOf(guestId, stone)).toBe(0);
    });
  }

  test('a Pokémon evolves into a species the trainer already owns, and the collection keeps both', async ({ database }) => {
    const { guestId, pokemonIds: [poliwhirl] } = await trainerWith([61, 62], ['water-stone']);
    expect(await evolveWithItem(database, { guestId, pokemonId: poliwhirl!, item: 'water-stone' })).toEqual({ outcome: 'evolved', from: 61, into: 62 });
    expect((await readCollectionOf(guestId)).map((pokemon) => pokemon.dex)).toEqual([62, 62]);
    expect(await quantityOf(guestId, 'water-stone')).toBe(0);
  });

  test('a double click consumes one stone and evolves the Pokémon once', async ({ database }) => {
    const { guestId, pokemonIds: [shellder] } = await trainerWith([90], ['water-stone']);
    const use = () => evolveWithItem(database, { guestId, pokemonId: shellder!, item: 'water-stone' });
    const outcomes = (await Promise.all([use(), use()])).map((result) => result.outcome).sort();
    expect(outcomes).toEqual(['cannot-use', 'evolved']);
    expect((await readCollectionOf(guestId)).map((pokemon) => pokemon.dex)).toEqual([91]);
    expect(await countEvolutions(guestId)).toBe(1);
  });
});

test.describe('evolving with a new stone or an evolution item', () => {
  for (const [from, item, into] of [[44, 'sun-stone', 182], [281, 'dawn-stone', 475], [95, 'metal-coat', 208], [82, 'thunder-stone', 462], [349, 'prism-scale', 350], [440, 'oval-stone', 113]] as const) {
    test(`#${from} becomes #${into} with the ${item}, which leaves the bag`, async ({ database }) => {
      const { guestId, pokemonIds: [pokemon] } = await trainerWith([from], [item]);
      expect(await evolveWithItem(database, { guestId, pokemonId: pokemon!, item })).toEqual({ outcome: 'evolved', from, into });
      expect((await readCollectionOf(guestId)).map((owned) => owned.dex)).toEqual([into]);
      expect(await quantityOf(guestId, item)).toBe(0);
    });
  }

  test('an evolution item works only on its own species', async ({ database }) => {
    const { guestId, pokemonIds: [onix, kadabra] } = await trainerWith([95, 64], ['kings-rock']);
    expect(await evolveWithItem(database, { guestId, pokemonId: onix!, item: 'kings-rock' })).toEqual({ outcome: 'cannot-use' });
    expect(await evolveWithItem(database, { guestId, pokemonId: kadabra!, item: 'kings-rock' })).toEqual({ outcome: 'cannot-use' });
    expect(await quantityOf(guestId, 'kings-rock')).toBe(1);
  });
});

async function countEvolutions(guestId: GuestId): Promise<number> {
  const [row] = await withTestDatabase((sql) => sql`select count(*)::int as total from stone_evolutions where guest_id = ${guestId}`);
  return row!.total as number;
}
