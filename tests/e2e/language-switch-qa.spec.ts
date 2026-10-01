import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { startAppServer, type AppServer } from './support/app-server';
import { enterAsGuest, readSessionToken, uniqueName } from './support/guests';
import { en, fr, localeButton, localeCookie, localeCookieName, setLocaleCookie, switchInterfaceTo } from './support/locale';
import { addMemberToRoom, createRoom } from './support/rooms';
import { startSwitchableDatabase, type SwitchableDatabase } from './support/switchable-database';
import { grantsSessionCookie, headersWithout, type CapturedSubmission } from './support/submissions';

async function expectWholeInterfaceIn(page: Page, messages: typeof en, locale: 'fr' | 'en'): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.getByRole('group', { name: messages.LocaleSwitch.label })).toBeVisible();
  await expect(localeButton(page, locale)).toHaveAttribute('aria-current', 'true');
}

test.describe('a second tab of the same player', () => {
  test('opened before the switch shows a fully English interface after a link navigation', async ({ context }) => {
    const staleTab = await context.newPage();
    await staleTab.goto('/nimporte-quoi');
    const switchingTab = await context.newPage();
    await switchingTab.goto('/');
    await switchInterfaceTo(switchingTab, 'en');

    await staleTab.getByRole('link', { name: en.NotFound.homeLink }).click();
    await expect(staleTab).toHaveURL('/');
    await expect(staleTab.getByText(en.Home.welcome)).toBeVisible();
    await expectWholeInterfaceIn(staleTab, en, 'en');
  });

  test('opened before the switch shows an English title and header on the play page after a link navigation', async ({ context }) => {
    const staleTab = await context.newPage();
    await enterAsGuest(staleTab, uniqueName('Zoe '));
    await staleTab.goto('/rooms/00000000-0000-4000-8000-000000000000');
    const switchingTab = await context.newPage();
    await switchingTab.goto('/play');
    await switchInterfaceTo(switchingTab, 'en');

    await staleTab.getByRole('link', { name: en.Room.backToPlay }).click();
    await expect(staleTab).toHaveURL('/play');
    await expect(staleTab.getByRole('button', { name: en.Play.createRoom })).toBeVisible();
    await expect(staleTab).toHaveTitle(en.Metadata.playTitle);
    await expectWholeInterfaceIn(staleTab, en, 'en');
  });

  test('left idle follows the switch without navigating and keeps the name being typed', async ({ context }) => {
    const idleTab = await context.newPage();
    await idleTab.goto('/');
    await idleTab.getByLabel(fr.GuestEntry.label).fill('Zoé tape');
    const switchingTab = await context.newPage();
    await switchingTab.goto('/nimporte-quoi');
    await switchInterfaceTo(switchingTab, 'en');

    await expectWholeInterfaceIn(idleTab, en, 'en');
    await expect(idleTab.getByLabel(en.GuestEntry.label)).toHaveValue('Zoé tape');
  });

  test('three tabs switching at once settle on the saved choice without refreshing forever', async ({ context }) => {
    const tabs = await Promise.all([context.newPage(), context.newPage(), context.newPage()]);
    for (const tab of tabs) await tab.goto('/');
    await Promise.all([localeButton(tabs[0]!, 'en').click(), localeButton(tabs[1]!, 'fr').click(), localeButton(tabs[2]!, 'en').click()]);
    await tabs[0]!.waitForTimeout(2000);
    const saved = (await localeCookie(context))!.value;
    for (const tab of tabs) await expect(tab.locator('html')).toHaveAttribute('lang', saved);

    let refreshes = 0;
    for (const tab of tabs) tab.on('request', (request) => (refreshes += request.headers()['rsc'] === '1' ? 1 : 0));
    await tabs[0]!.waitForTimeout(3000);
    expect(refreshes).toBe(0);
  });
});

test.describe('history after switching', () => {
  test('back to a page first seen in French shows it in English, and forward too', async ({ page }) => {
    const name = uniqueName('Zoe ');
    await enterAsGuest(page, name);
    await createRoom(page);
    await switchInterfaceTo(page, 'en');
    await page.goBack();
    await expect(page).toHaveURL('/play');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.Play.greeting.replace('{name}', name));
    await expectWholeInterfaceIn(page, en, 'en');
    await page.goForward();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.Room.heading);
    await expectWholeInterfaceIn(page, en, 'en');
  });

  test('a link prefetched in French before the switch opens in English', async ({ page }) => {
    await page.goto('/nimporte-quoi');
    await page.waitForLoadState('networkidle');
    await switchInterfaceTo(page, 'en');
    await page.getByRole('link', { name: en.NotFound.homeLink }).click();
    await expect(page.getByText(en.Home.welcome)).toBeVisible();
    await expectWholeInterfaceIn(page, en, 'en');
  });
});

test.describe('switch robustness', () => {
  test('two quick clicks keep the last language chosen', async ({ page, context }) => {
    await page.goto('/');
    await localeButton(page, 'en').click();
    await localeButton(page, 'fr').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect.poll(async () => (await localeCookie(context))?.value).toBe('fr');
  });

  test('an undecodable room address keeps its address and shows the English room-not-found page', async ({ page }) => {
    const response = await page.goto('/rooms/%E0');
    expect(response?.status()).toBe(404);
    await switchInterfaceTo(page, 'en');
    await expect(page).toHaveURL('/rooms/%E0');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.Room.notFoundHeading);
  });

  test('a waiting room with two players reads "2 players" in English and "2 joueurs" in French', async ({ page }) => {
    await enterAsGuest(page, uniqueName('Zoe '));
    const roomId = await createRoom(page);
    await addMemberToRoom(roomId, uniqueName('Alex '));
    await page.reload();
    await expect(page.getByText('2 joueurs', { exact: true })).toBeVisible();
    await switchInterfaceTo(page, 'en');
    await expect(page.getByText('2 players', { exact: true })).toBeVisible();
  });

  test('the session cookie is left untouched when switching in a room', async ({ page, context }) => {
    await enterAsGuest(page, uniqueName('Zoe '));
    await createRoom(page);
    const token = await readSessionToken(context);
    await switchInterfaceTo(page, 'en');
    await switchInterfaceTo(page, 'fr');
    expect(await readSessionToken(context)).toBe(token);
  });
});

test.describe('without JavaScript on an unknown address', () => {
  test.use({ javaScriptEnabled: false });

  test('the switch keeps the address and renders the English 404', async ({ page }) => {
    const response = await page.goto('/nimporte-quoi');
    expect(response?.status()).toBe(404);
    await localeButton(page, 'en').click();
    await expect(page).toHaveURL('/nimporte-quoi');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.NotFound.heading);
  });
});

async function captureSwitch(page: Page): Promise<CapturedSubmission> {
  const captured = new Promise<CapturedSubmission>((resolve) => {
    void page.route('**/*', async (route) => {
      const request = route.request();
      if (request.method() !== 'POST') return route.continue();
      resolve({ headers: headersWithout(request.headers(), ['content-length', 'cookie']), body: request.postDataBuffer()! });
      return route.abort();
    });
  });
  await localeButton(page, 'en').click();
  return captured;
}

function replaceField(captured: CapturedSubmission, field: string, value: string): Buffer {
  const pattern = new RegExp(`(name="${field}"\\r\\n\\r\\n)[^\\r]*`);
  return Buffer.from(captured.body.toString('utf8').replace(pattern, (_match, prefix: string) => `${prefix}${value}`));
}

async function replayLocation(request: APIRequestContext, captured: CapturedSubmission, data: Buffer): Promise<string> {
  const response = await request.post('/', { headers: captured.headers, data, maxRedirects: 0 });
  expect(response.status()).toBe(303);
  return response.headers()['location']!;
}

test.describe('more tampered return addresses', () => {
  test.use({ javaScriptEnabled: false });

  const escapeAttempts = [
    '/a\\..\\..\\/evil.example',
    '/.//evil.example',
    '/%2F%2Fevil.example',
    '/%5C%5Cevil.example',
    '\\\\evil.example',
    '/\t/evil.example',
    '/%0d%0aSet-Cookie:%20x=1',
    '/　/evil.example',
    '/' + 'a'.repeat(3000),
  ];

  for (const target of escapeAttempts) {
    test(`return address ${JSON.stringify(target.slice(0, 30))} stays a path on this site`, async ({ page, request }) => {
      await page.goto('/');
      const captured = await captureSwitch(page);
      const location = await replayLocation(request, captured, replaceField(captured, 'returnTo', target));
      expect(location.startsWith('/')).toBe(true);
      expect(location.startsWith('//')).toBe(false);
      expect(location).not.toMatch(/[\r\n\\]/);
      expect(new URL(location, 'http://localhost').origin).toBe('http://localhost');
    });
  }

  test('a query string stays in the return address, a fragment does not, and the target stays on the site', async ({ page, request }) => {
    await page.goto('/');
    const captured = await captureSwitch(page);
    expect(await replayLocation(request, captured, replaceField(captured, 'returnTo', '/play?next=//evil.example#x'))).toBe('/play?next=//evil.example');
  });

  for (const value of ['en ', 'EN', '<script>', '']) {
    test(`language value ${JSON.stringify(value)} sets no cookie`, async ({ page, request }) => {
      await page.goto('/');
      const captured = await captureSwitch(page);
      const response = await request.post('/', { headers: captured.headers, data: replaceField(captured, 'locale', value), maxRedirects: 0 });
      expect(response.status()).toBe(303);
      expect(grantsSessionCookie(response, localeCookieName)).toBe(false);
    });
  }
});

const outageServerPort = Number(process.env.E2E_PORT ?? 3100) + 9;
const outageServerUrl = `http://localhost:${outageServerPort}`;
const productionBuildExists = existsSync(path.join(process.cwd(), '.next', 'BUILD_ID'));

test.describe('server error page in English', () => {
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

  test('follows the English choice and still offers the language switch', async ({ page, context }) => {
    await context.addCookies([{ name: localeCookieName, value: 'en', url: outageServerUrl }]);
    await page.goto(`${outageServerUrl}/`);
    await page.getByLabel(en.GuestEntry.label).fill(uniqueName('Outage '));
    await page.getByRole('button', { name: en.GuestEntry.submit }).click();
    await expect(page).toHaveURL(`${outageServerUrl}/play`);
    database.setAvailable(false);
    try {
      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.ServerError.heading);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await localeButton(page, 'fr').click();
      await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.ServerError.heading);
    } finally {
      database.setAvailable(true);
    }
  });
});

test.describe('first visit with a leftover next-intl cookie', () => {
  test('NEXT_LOCALE=en alone does not switch the interface', async ({ page, context }) => {
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }]);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await setLocaleCookie(context, 'en');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
