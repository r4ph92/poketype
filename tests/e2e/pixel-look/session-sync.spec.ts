import { expect, test, type Page } from '@playwright/test';
import fr from '../../../messages/fr.json';
import { accountLabel, signUp, uniquePassword, uniqueUsername } from '../support/accounts';
import { enterAsGuest, uniqueName } from '../support/guests';

const accountNavigation = (page: Page) => page.getByRole('navigation', { name: fr.AccountBar.label });

test('a sign-up and a log-out in one tab update the header of another tab without navigating', async ({ context }) => {
  const actingTab = await context.newPage();
  const watchingTab = await context.newPage();
  await enterAsGuest(actingTab, uniqueName('Sync '));
  await watchingTab.goto('/play');
  await expect(accountNavigation(watchingTab).getByRole('link', { name: fr.AccountBar.signUp })).toBeVisible();

  const username = uniqueUsername('Sync_');
  await signUp(actingTab, { username, password: uniquePassword() });
  await expect(accountNavigation(watchingTab)).toHaveText(accountLabel(username));

  await actingTab.getByRole('button', { name: fr.AccountBar.logOut }).click();
  await expect(watchingTab).toHaveURL('/');
  await expect(accountNavigation(watchingTab).getByRole('link', { name: fr.AccountBar.signUp })).toBeVisible();
});
