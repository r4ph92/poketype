import { expect, test } from '@playwright/test';
import fr from '../../messages/fr.json';
import { submitSignUp, uniqueUsername, uniquePassword } from './support/accounts';
import { withTestDatabase } from './support/guests';
import { expectNoAccessibilityViolations } from './support/axe';

for (const width of [375, 1440]) {
  test(`signup trainer choice persists into camp at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1024 });
    const username = uniqueUsername();
    await submitSignUp(page, { username, password: uniquePassword() });
    await expect(page).toHaveURL('/choose-trainer');
    await expect(page).toHaveTitle(fr.ChooseTrainer.title);
    await expect(page.getByRole('radio')).toHaveCount(6);
    await page.getByText(fr.ChooseTrainer.names.may, { exact: true }).click();
    await expect(page.getByRole('radio', { name: fr.ChooseTrainer.names.may, exact: true })).toBeChecked();
    await expect.poll(() => page.locator('canvas').evaluateAll((canvases) => canvases.every((canvas) => (canvas as HTMLElement).dataset.ready === 'true'))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expectNoAccessibilityViolations(page);
    await page.screenshot({ path: `test-results/choose-trainer-${width}.png`, fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: fr.ChooseTrainer.confirm }).click();
    await expect(page).toHaveURL('/play/choose-starter');
    await expect(page.getByRole('radio')).toHaveCount(3);
    await expect(page.getByRole('button', { name: fr.ChooseStarter.confirm })).toHaveAttribute('aria-disabled', 'true');
    await page.getByText(fr.ChooseStarter.names['7'], { exact: true }).click();
    await expectNoAccessibilityViolations(page);
    await page.screenshot({ path: `test-results/choose-starter-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: fr.ChooseStarter.confirm }).click();
    await expect(page).toHaveURL('/play');
    await expect(page.locator('.camp-partner [data-species="squirtle"]')).toHaveCount(1);
    await expect(page.locator('.camp-storage-link')).toHaveCount(0);
    await expect(page.locator('.camp-trainer canvas')).toHaveAttribute('data-trainer-avatar', 'may');
    await expect(page.locator('.camp-trainer canvas')).toHaveAttribute('data-ready', 'true');
    await page.reload();
    await expect(page.locator('.camp-trainer canvas')).toHaveAttribute('data-trainer-avatar', 'may');
    await expect(page.locator('.camp-trainer canvas')).toHaveAttribute('data-ready', 'true');
    const avatar = await withTestDatabase(async (sql) => (await sql`select trainer_avatar from users where username = ${username}`)[0]!.trainer_avatar);
    expect(avatar).toBe('may');
    await page.screenshot({ path: `test-results/trainer-camp-${width}.png`, animations: 'disabled' });
    await page.getByRole('link', { name: fr.Trainer.changeTrainer }).click();
    await expect(page.getByRole('radio', { name: fr.ChooseTrainer.names.may, exact: true })).toBeChecked();
    await page.getByRole('radio', { name: fr.ChooseTrainer.names.may, exact: true }).evaluate((input) => (input as HTMLInputElement).value = 'invalid-avatar');
    await page.getByRole('button', { name: fr.ChooseTrainer.confirm }).click();
    await expect(page.getByRole('alert').filter({ hasText: fr.ChooseTrainer.invalid })).toHaveText(fr.ChooseTrainer.invalid);
    expect(await withTestDatabase(async (sql) => (await sql`select trainer_avatar from users where username = ${username}`)[0]!.trainer_avatar)).toBe('may');
  });
}

test('trainer selection requires an account', async ({ page }) => {
  await page.goto('/choose-trainer');
  await expect(page).toHaveURL('/signup');
});
