import { expect, type Page } from '@playwright/test';
import fr from '../../../messages/fr.json';
import { withTestDatabase } from './guests';

export type StarterDex = 1 | 4 | 7;

export const starterSpecies = { 1: 'bulbasaur', 4: 'charmander', 7: 'squirtle' } as const;

export const starterScreen = /\/play\/choose-starter(\?next=.+)?$/;

// Works with or without JavaScript: the starter screen is a plain form.
export async function chooseStarterOnScreen(page: Page, dex: StarterDex = 4): Promise<void> {
  await expect(page).toHaveURL(starterScreen, { timeout: 15_000 });
  await page.getByText(fr.ChooseStarter.names[dex], { exact: true }).click();
  await page.getByRole('button', { name: fr.ChooseStarter.confirm }).click();
}

// Test players made straight in the database get a starter partner too, as every player who enters through the screens does.
export async function giveStarter(guestId: string, dex: StarterDex = 4): Promise<void> {
  await withTestDatabase((sql) => sql`insert into owned_pokemon (guest_id, dex, level, is_partner) values (${guestId}, ${dex}, 5, true) on conflict do nothing`);
}

export async function givePokemon(guestId: string, dex: number, level = 5): Promise<void> {
  await withTestDatabase((sql) => sql`insert into owned_pokemon (guest_id, dex, level) values (${guestId}, ${dex}, ${level}) on conflict do nothing`);
}

export type OwnedRow = { dex: number; level: number; xp: number; isPartner: boolean };

export async function readCollectionOf(guestId: string): Promise<OwnedRow[]> {
  return withTestDatabase(async (sql) => {
    const rows = await sql`select dex, level, xp, is_partner from owned_pokemon where guest_id = ${guestId} order by dex`;
    return rows.map((row) => ({ dex: row.dex as number, level: row.level as number, xp: row.xp as number, isPartner: row.is_partner as boolean }));
  });
}

export async function findGuestIdNamed(trainerName: string): Promise<string> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`select id from guests where trainer_name = ${trainerName} order by created_at desc limit 1`;
    return row!.id as string;
  });
}

export async function readEarnedBadges(guestId: string): Promise<string[]> {
  return withTestDatabase(async (sql) => {
    const rows = await sql`select badge from earned_badges where guest_id = ${guestId} order by earned_at, badge`;
    return rows.map((row) => row.badge as string);
  });
}

// Statistics and per-Pokémon records are data, not catalog text, so the visible-string check is told about them.
export async function readHubNumbers(page: Page): Promise<string[]> {
  return page.locator('.trainer-stats dd, .pokemon-record dd').allTextContents();
}
