import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium, expect, test, type Browser, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { accountLabel } from './support/accounts';
import { startAppServer, type AppServer } from './support/app-server';
import { accountNavigation, fillLogIn, maya } from './support/login';

const productionPort = Number(process.env.E2E_PORT ?? 3100) + 2;
const productionUrl = `http://localhost:${productionPort}`;
const productionBuildExists = existsSync(path.join(process.cwd(), '.next', 'BUILD_ID'));

async function logInAsMayaOnProduction(page: Page): Promise<void> {
  await page.goto(`${productionUrl}/login`);
  await fillLogIn(page, maya.username, maya.password);
  await expect(page).toHaveURL(`${productionUrl}/play`);
}

async function logOutThenGoBack(page: Page): Promise<void> {
  await page.goto(`${productionUrl}/credits`);
  await expect(accountNavigation(page)).toHaveText(accountLabel(maya.username));
  await page.getByRole('button', { name: fr.AccountBar.logOut }).click();
  await expect(page).toHaveURL(`${productionUrl}/`);
  await page.goBack();
}

async function expectNoAccount(page: Page): Promise<void> {
  await expect(accountNavigation(page).getByRole('link', { name: fr.AccountBar.logIn })).toBeVisible();
  await expect(accountNavigation(page)).not.toContainText(maya.username);
}

// The dev server sends "no-cache" so that Back reuses its HTML; only the production server shows the real caching headers.
test.describe('production server: Back after logging out', () => {
  test.describe.configure({ mode: 'default' });
  test.skip(!productionBuildExists, 'starts a production server from the existing build');

  let appServer: AppServer | undefined;

  test.beforeAll(async () => {
    appServer = await startAppServer(productionPort, process.env.TEST_DATABASE_URL!);
  });

  test.afterAll(async () => {
    await appServer?.stop();
  });

  test('a page showing an account is sent with no-store', async ({ page }) => {
    await logInAsMayaOnProduction(page);
    const response = await page.request.get(`${productionUrl}/play`);
    expect(response.headers()['cache-control']).toContain('no-store');
  });

  test('without JavaScript, Back after logging out does not show Maya', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`${productionUrl}/login`);
    await page.getByLabel(fr.SignUp.usernameLabel).fill(maya.username);
    await page.getByLabel(fr.SignUp.passwordLabel, { exact: true }).fill(maya.password);
    await page.getByRole('button', { name: fr.LogIn.submit }).click();
    await expect(page).toHaveURL(`${productionUrl}/play`);

    await logOutThenGoBack(page);

    await expectNoAccount(page);
    await context.close();
  });

  test('with the back-forward cache on, Back after logging out does not show Maya', async () => {
    const browserWithCache: Browser = await chromium.launch({ ignoreDefaultArgs: ['--disable-back-forward-cache'] });
    const page = await (await browserWithCache.newContext()).newPage();
    await logInAsMayaOnProduction(page);

    await logOutThenGoBack(page);

    await expectNoAccount(page);
    await browserWithCache.close();
  });
});
