import { eq, sql } from 'drizzle-orm';
import { pokedex } from '../src/assets/pokedex';
import { gameConfig } from '../src/config/game';
import { badgeIds } from '../src/domain/badges';
import type { GuestId } from '../src/domain/guest-id';
import { validateNewPassword } from '../src/domain/new-password';
import { loginUsernameKey } from '../src/domain/username';
import { insertAccount } from '../src/server/accounts/account-commands';
import { hashPassword } from '../src/server/accounts/password-hash';
import * as schema from '../src/server/db/schema';
import type { Database } from '../src/server/db/types';
import { choosePartner } from '../src/server/trainer/collection-commands';
import { findPartner } from '../src/server/trainer/partner';

// A normal account (no special rights) holding every Kanto Pokémon and every badge, to show the full collection in class.
export const ashUsername = 'ash';

const pikachuDex = 25;

// Returns whether the account was created. An existing ash keeps its password and only gets what it is missing.
export async function seedAsh(database: Database, password: string): Promise<boolean> {
  if (!validateNewPassword(password, password).ok) throw new Error('SEED_ASH_PASSWORD must be between 8 and 128 characters.');
  const existing = await findAccountGuest(database, ashUsername);
  const guestId = existing ?? (await createAsh(database, password));
  await giveEveryPokemon(database, guestId);
  await giveEveryBadge(database, guestId);
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

async function giveEveryPokemon(database: Database, guestId: GuestId): Promise<void> {
  const level = gameConfig.progression.startingLevel;
  await database.insert(schema.ownedPokemon).values(pokedex.map(({ dex }) => ({ guestId, dex, level }))).onConflictDoNothing();
  if (!(await findPartner(database, guestId))) await choosePartner(database, guestId, pikachuDex);
}

async function giveEveryBadge(database: Database, guestId: GuestId): Promise<void> {
  await database.insert(schema.earnedBadges).values(badgeIds.map((badge) => ({ guestId, badge }))).onConflictDoNothing();
}
