import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { startAppServer, type AppServer } from './support/app-server';
import { captureSignUpSubmission, countUsersNamed, replaySignUp, uniquePassword, uniqueUsername } from './support/accounts';
import { greetingFor, uniqueName } from './support/guests';
import { confirmCreateRoom, countRoomsHostedBy } from './support/rooms';
import { startSwitchableDatabase, type SwitchableDatabase } from './support/switchable-database';

const outageServerPort = Number(process.env.E2E_PORT ?? 3100) + 1;
const outageServerUrl = `http://localhost:${outageServerPort}`;
const productionBuildExists = existsSync(path.join(process.cwd(), '.next', 'BUILD_ID'));

async function enterOnOutageServer(page: Page, name: string): Promise<void> {
  await page.goto(`${outageServerUrl}/`);
  await page.getByLabel(fr.GuestEntry.label).fill(name);
  await page.getByRole('button', { name: fr.GuestEntry.submit }).click();
}

test.describe('separate production server: database outage and hashing burst', () => {
  test.describe.configure({ mode: 'default' });
  test.skip(!productionBuildExists, 'starts a second production server from the existing build');

  let database: SwitchableDatabase;
  let appServer: AppServer | undefined;

  test.beforeAll(async () => {
    database = await startSwitchableDatabase(process.env.TEST_DATABASE_URL!);
    appServer = await startAppServer(outageServerPort, database.url);
  });

  test.afterAll(async () => {
    await appServer?.stop();
    await database?.close();
  });

  test.afterEach(() => database.setAvailable(true));

  test('once the database is back, Réessayer brings the play page back without a browser reload', async ({ page }) => {
    const name = uniqueName('Panne ');
    await enterOnOutageServer(page, name);
    await expect(page).toHaveURL(`${outageServerUrl}/play`);

    database.setAvailable(false);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.ServerError.heading);

    database.setAvailable(true);
    await page.getByRole('button', { name: fr.ServerError.retry }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(greetingFor(name));
  });

  test('creating a room during an outage shows the French error page, creates no room, and Réessayer brings the play page back', async ({
    page,
  }) => {
    const name = uniqueName('Panne ');
    await enterOnOutageServer(page, name);
    await expect(page).toHaveURL(`${outageServerUrl}/play`);

    database.setAvailable(false);
    await page.getByRole('button', { name: fr.Play.createRoom }).click();
    await confirmCreateRoom(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.ServerError.heading);
    await expect(page.locator('body')).not.toContainText('Internal Server Error');

    database.setAvailable(true);
    expect(await countRoomsHostedBy(name)).toBe(0);
    await page.getByRole('button', { name: fr.ServerError.retry }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(greetingFor(name));
  });

  test('signing up during an outage shows the French error page and creates no account', async ({ page }) => {
    const username = uniqueUsername();
    const password = uniquePassword();
    await page.goto(`${outageServerUrl}/signup`);
    await page.getByLabel(fr.SignUp.usernameLabel).fill(username);
    await page.getByLabel(fr.SignUp.passwordLabel, { exact: true }).fill(password);
    await page.getByLabel(fr.SignUp.confirmationLabel).fill(password);

    database.setAvailable(false);
    await page.getByRole('button', { name: fr.SignUp.submit }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.ServerError.heading);
    await expect(page.locator('body')).not.toContainText(password);

    database.setAvailable(true);
    expect(await countUsersNamed(username)).toBe(0);
  });

  test('a burst of sign ups beyond the hashing limit is answered with the busy error and never a server error', async ({
    page,
    request,
  }) => {
    const template = uniqueUsername('Burst_');
    const captured = await captureSignUpSubmission(page, { username: template, password: uniquePassword() }, `${outageServerUrl}/signup`);
    const usernames = Array.from({ length: 20 }, () => uniqueUsername('Burst_'));
    const responses = await Promise.all(
      usernames.map((username) =>
        replaySignUp(request, captured, {
          url: `${outageServerUrl}/signup`,
          body: Buffer.from(captured.body.toString('utf8').replace(template, username)),
        }),
      ),
    );
    expect(responses.every((response) => response.status() < 500)).toBe(true);
    const busy = await Promise.all(responses.map(async (response) => (await response.text()).includes('"busy"')));
    const created = await Promise.all(usernames.map(countUsersNamed));
    expect(busy.filter(Boolean).length).toBeGreaterThan(0);
    busy.forEach((isBusy, index) => expect(created[index], usernames[index]).toBe(isBusy ? 0 : 1));
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    // No-JS server failure page is deferred (#12 round 3).
    test.fixme('an entry during a database outage shows the French error page, not English plain text', async ({ page }) => {
      database.setAvailable(false);
      await enterOnOutageServer(page, uniqueName('Panne '));
      await expect(page.locator('body')).not.toContainText('Internal Server Error');
      await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.ServerError.heading);
    });
  });
});
