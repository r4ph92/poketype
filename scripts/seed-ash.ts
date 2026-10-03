import { eq, sql } from 'drizzle-orm';
import { pokedex } from '../src/assets/pokedex';
import { legendaryRewards } from '../src/config/achievements';
import { gameConfig } from '../src/config/game';
import { badgeIds } from '../src/domain/badges';
import { evolutionItemIds, type BagItem } from '../src/domain/shop-item';
import type { GuestId } from '../src/domain/guest-id';
import { validateNewPassword } from '../src/domain/new-password';
import { loginUsernameKey } from '../src/domain/username';
import { insertAccount } from '../src/server/accounts/account-commands';
import { hashPassword } from '../src/server/accounts/password-hash';
import * as schema from '../src/server/db/schema';
import type { Database, DatabaseTransaction } from '../src/server/db/types';
import { creditCoins, findCoins } from '../src/server/shop/wallet';
import { lockGuest } from '../src/server/trainer/guest-lock';
import { choosePartner } from '../src/server/trainer/collection-commands';
import { findOwnedRows } from '../src/server/trainer/owned-pokemon';
import { findPartner } from '../src/server/trainer/partner';

// A normal account (no special rights) holding every Pokémon from Kanto to Unova, every badge, a full wallet and a stocked bag, to show everything in class.
export const ashUsername = 'ash';

const pikachuDex = 25;

const ashCoins = 99_999;

const ashBoxes = Math.ceil(pokedex.length / gameConfig.storage.boxSlots);

const ashBag: readonly BagItem[] = [...evolutionItemIds.map((item) => ({ item, quantity: 10 })), { item: 'poke-ball', quantity: 50 }];

// Returns whether the account was created. An existing ash keeps its password and only gets what it is missing.
export async function seedAsh(database: Database, password: string): Promise<boolean> {
  if (!validateNewPassword(password, password).ok) throw new Error('SEED_ASH_PASSWORD must be between 8 and 128 characters.');
  const existing = await findAccountGuest(database, ashUsername);
  const guestId = existing ?? (await createAsh(database, password));
  await giveEveryPokemon(database, guestId);
  await giveEveryBadge(database, guestId);
  await fillWallet(database, guestId);
  return existing === null;
}

export async function findAccountGuest(database: Database, username: string): Promise<GuestId | null> {
  const [account] = await database.select({ guestId: schema.users.guestId }).from(schema.users).where(eq(sql`lower(${schema.users.username})`, loginUsernameKey(username)));
  return account?.guestId ?? null;
}

async function createAsh(database: Database, password: string): Promise<GuestId> {
  const passwordHash = await hashPassword(password);
  const { guestId } = await database.transaction((transaction) => insertAccount(transaction, { username: ashUsername, passwordHash }));
  return guestId;
}

// Every Pokémon sits at the maximum level, so ash shows full progression without racing. Only missing species are added, so seeding again adds no duplicate.
async function giveEveryPokemon(database: Database, guestId: GuestId): Promise<void> {
  const level = gameConfig.progression.maxLevel;
  const ownedDexes = new Set((await findOwnedRows(database, guestId)).map((pokemon) => pokemon.dex));
  const missing = pokedex.filter(({ dex }) => !ownedDexes.has(dex));
  if (missing.length > 0) await database.insert(schema.ownedPokemon).values(missing.map(({ dex }) => ({ guestId, dex, level })));
  await database.update(schema.ownedPokemon).set({ level, xp: 0 }).where(eq(schema.ownedPokemon.guestId, guestId));
  await database.update(schema.guests).set({ pcBoxes: sql`greatest(${schema.guests.pcBoxes}, ${ashBoxes})` }).where(eq(schema.guests.id, guestId));
  await database.insert(schema.legendaryGrants).values(legendaryRewards.map(({ dex }) => ({ guestId, dex, claimedAt: new Date() }))).onConflictDoNothing();
  if (!(await findPartner(database, guestId))) await choosePikachu(database, guestId);
}

async function choosePikachu(database: Database, guestId: GuestId): Promise<void> {
  const pikachu = (await findOwnedRows(database, guestId)).find((pokemon) => pokemon.dex === pikachuDex);
  if (pikachu) await choosePartner(database, guestId, pikachu.id);
}

async function giveEveryBadge(database: Database, guestId: GuestId): Promise<void> {
  await database.insert(schema.earnedBadges).values(badgeIds.map((badge) => ({ guestId, badge }))).onConflictDoNothing();
}

// Tops the wallet and the bag up to the demo amounts and never lowers them, so seeding again changes nothing.
async function fillWallet(database: Database, guestId: GuestId): Promise<void> {
  await database.transaction(async (transaction) => {
    await lockGuest(transaction, guestId);
    const missing = ashCoins - (await findCoins(transaction, guestId));
    if (missing > 0) await creditCoins(transaction, { guestId, reason: 'seed', amount: missing });
    for (const line of ashBag) await topUpBag(transaction, guestId, line);
  });
}

async function topUpBag(transaction: DatabaseTransaction, guestId: GuestId, { item, quantity }: BagItem): Promise<void> {
  const { bagItems } = schema;
  await transaction
    .insert(bagItems)
    .values({ guestId, item, quantity })
    .onConflictDoUpdate({ target: [bagItems.guestId, bagItems.item], set: { quantity: sql`greatest(${bagItems.quantity}, ${quantity})` } });
}
