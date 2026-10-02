import { expect, test } from '@playwright/test';
import fr from '../../messages/fr.json';
import { seedDatabase } from '../../scripts/seed-database';
import { ashUsername } from '../../scripts/seed-ash';
import { findAccount } from './support/accounts';
import { submitLogIn } from './support/login';
import { readCollectionOf, readEarnedBadges } from './support/trainer';

function ashPassword(): string {
  const password = process.env.SEED_ASH_PASSWORD;
  if (!password) throw new Error('SEED_ASH_PASSWORD is not set; the e2e seed needs it to create ash.');
  return password;
}

test('seeding again keeps ash at exactly 151 Pokémon, one Pikachu partner and the eight badges', async () => {
  ashPassword();
  await seedDatabase(process.env.TEST_DATABASE_URL!);
  await seedDatabase(process.env.TEST_DATABASE_URL!);
  const ash = (await findAccount(ashUsername))!;
  const collection = await readCollectionOf(ash.guestId);
  expect(collection).toHaveLength(151);
  expect(new Set(collection.map((pokemon) => pokemon.dex)).size).toBe(151);
  expect(collection.filter((pokemon) => pokemon.isPartner).map((pokemon) => pokemon.dex)).toEqual([25]);
  expect((await readEarnedBadges(ash.guestId)).sort()).toEqual(['boulder', 'cascade', 'earth', 'marsh', 'rainbow', 'soul', 'thunder', 'volcano']);
});

test('ash logs in like any trainer and sees the full collection, every badge and a complete Pokédex', async ({ page }) => {
  await submitLogIn(page, ashUsername, ashPassword());
  await expect(page).toHaveURL('/play', { timeout: 15_000 });
  await expect(page.getByRole('region', { name: fr.Trainer.partner, exact: true }).getByRole('heading', { name: fr.Trainer.species['25'] })).toBeVisible();
  await expect(page.getByRole('region', { name: fr.Trainer.badgesTitle, exact: true })).toContainText('8 / 8');
  await expect(page.locator('.badge-locked')).toHaveCount(0);
  await page.getByRole('link', { name: fr.Header.tabs.collection, exact: true }).click();
  await expect(page.getByRole('region', { name: fr.Trainer.storage, exact: true }).locator('button.pokemon-slot')).toHaveCount(151);
  await page.goto('/play/pokedex');
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '151');
  await page.goto('/play/achievements');
  await expect(page.getByText(fr.Achievements.metrics.badgesEarned.replace('{current}', '8').replace('{target}', '8')).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: fr.Pokemon.mew, exact: true })).toBeVisible();
});
