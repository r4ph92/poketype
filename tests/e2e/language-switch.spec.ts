import { expect, test, type Page } from '@playwright/test';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import {
  countSessionsFor,
  enterAsGuest,
  readSessionToken,
  submitTrainerName,
  uniqueName,
  withTestDatabase,
} from './support/guests';
import { en, fr, localeButton, localeCookie, setLocaleCookie, switchInterfaceTo } from './support/locale';
import { countMembersOf, createRoom } from './support/rooms';

async function addExistingGuestToRoom(roomId: string, trainerName: string): Promise<void> {
  await withTestDatabase(async (sql) => {
    await sql`insert into room_members (room_id, guest_id) select ${roomId}, id from guests where trainer_name = ${trainerName}`;
  });
}

async function expectEnglishPage(page: Page, userTexts: string[] = []): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expectEveryVisibleStringFromCatalog(page, userTexts, 'en');
}

test.describe('switching to English on every page', () => {
  test('the home page', async ({ page }) => {
    await page.goto('/');
    await switchInterfaceTo(page, 'en');
    await expect(page).toHaveURL('/');
    await expect(page.getByText(en.Home.welcome)).toBeVisible();
    await expect(page).toHaveTitle(en.Metadata.title);
    await expectEnglishPage(page);
  });

  test('the home page showing a length error', async ({ page }) => {
    await submitTrainerName(page, 'A');
    await expect(page.locator('#trainer-name-error')).toBeVisible();
    await switchInterfaceTo(page, 'en');
    await expect(page.locator('#trainer-name-error')).toBeHidden();
    await expectEnglishPage(page);
  });

  test('the play page keeps the guest session', async ({ page, context }) => {
    const name = uniqueName();
    await enterAsGuest(page, name);
    const token = await readSessionToken(context);
    await switchInterfaceTo(page, 'en');
    await expect(page).toHaveURL('/play');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.Play.greeting.replace('{name}', name));
    await expect(page).toHaveTitle(en.Metadata.playTitle);
    await expectEnglishPage(page, [name]);
    expect(await readSessionToken(context)).toBe(token);
    expect(await countSessionsFor(token)).toBe(1);
  });

  test('a waiting room keeps its address and its members', async ({ page }) => {
    await enterAsGuest(page, uniqueName());
    const roomId = await createRoom(page);
    await switchInterfaceTo(page, 'en');
    await expect(page).toHaveURL(new RegExp(`/rooms/${roomId}$`));
    await expect(page.getByText('1 player', { exact: true })).toBeVisible();
    await expect(page.getByText(en.Room.hostBadge, { exact: true })).toBeVisible();
    await expect(page.getByText(en.Room.youMarker, { exact: true })).toBeVisible();
    expect(await countMembersOf(roomId)).toBe(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.Room.heading);
  });

  test('an unknown address', async ({ page }) => {
    await page.goto('/nimporte-quoi');
    await switchInterfaceTo(page, 'en');
    await expect(page).toHaveURL('/nimporte-quoi');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.NotFound.heading);
    await expect(page).toHaveTitle(en.Metadata.notFoundTitle);
    await expectEnglishPage(page);
  });

  test('a room that does not exist for the visitor', async ({ page, browser }) => {
    const host = await (await browser.newContext()).newPage();
    await enterAsGuest(host, uniqueName('Alex '));
    const roomId = await createRoom(host);
    await enterAsGuest(page, uniqueName('Zoe '));
    const response = await page.goto(`/rooms/${roomId}`);
    expect(response?.status()).toBe(404);
    await switchInterfaceTo(page, 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.Room.notFoundHeading);
    await expectEnglishPage(page);
    await host.context().close();
  });

  test('the choice can be switched back to French', async ({ page }) => {
    await page.goto('/');
    await switchInterfaceTo(page, 'en');
    await switchInterfaceTo(page, 'fr');
    await expectEveryVisibleStringFromCatalog(page);
  });
});

test.describe('the switch itself', () => {
  test('keeps focus on the current language button after switching', async ({ page }) => {
    await page.goto('/');
    await localeButton(page, 'en').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(localeButton(page, 'en')).toBeFocused();
  });

  test('marks only the current language', async ({ page }) => {
    await page.goto('/');
    await expect(localeButton(page, 'fr')).toHaveAttribute('aria-current', 'true');
    await expect(localeButton(page, 'en')).not.toHaveAttribute('aria-current');
    await switchInterfaceTo(page, 'en');
    await expect(localeButton(page, 'en')).toHaveAttribute('aria-current', 'true');
    await expect(localeButton(page, 'fr')).not.toHaveAttribute('aria-current');
    await expect(page.getByRole('group', { name: en.LocaleSwitch.label })).toBeVisible();
  });

  test('has buttons of at least 44 by 44 pixels', async ({ page }) => {
    await page.goto('/');
    for (const locale of ['fr', 'en'] as const) {
      const box = await localeButton(page, locale).boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('does not change the other player’s interface in the same room', async ({ browser }) => {
    const zoe = await (await browser.newContext()).newPage();
    const alex = await (await browser.newContext()).newPage();
    const alexName = uniqueName('Alex ');
    await enterAsGuest(zoe, uniqueName('Zoe '));
    const roomId = await createRoom(zoe);
    await enterAsGuest(alex, alexName);
    await addExistingGuestToRoom(roomId, alexName);
    await alex.goto(`/rooms/${roomId}`);
    await switchInterfaceTo(zoe, 'en');
    await alex.reload();
    await expect(alex.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(zoe.locator('html')).toHaveAttribute('lang', 'en');
    await zoe.context().close();
    await alex.context().close();
  });
});

test.describe('the choice is remembered', () => {
  test('after a reload, in a new tab and through navigation', async ({ page, context }) => {
    const name = uniqueName();
    await enterAsGuest(page, name);
    await switchInterfaceTo(page, 'en');
    await page.reload();
    await expectEnglishPage(page, [name]);
    const otherTab = await context.newPage();
    await otherTab.goto('/play');
    await expectEnglishPage(otherTab, [name]);
    await page.goto('/nimporte-quoi');
    await page.getByRole('link', { name: en.NotFound.homeLink }).click();
    await expect(page).toHaveURL('/play');
    await expectEnglishPage(page, [name]);
  });

  test('with a one-year, HTTP-only, lax cookie scoped to the whole site', async ({ page, context }) => {
    await page.goto('/');
    await switchInterfaceTo(page, 'en');
    const cookie = await localeCookie(context);
    expect(cookie).toMatchObject({ value: 'en', httpOnly: true, sameSite: 'Lax', path: '/' });
    const lifetimeDays = (cookie!.expires - Date.now() / 1000) / 86400;
    expect(lifetimeDays).toBeGreaterThan(364);
    expect(lifetimeDays).toBeLessThanOrEqual(366);
  });

  test('with a cookie set before the first visit, every page renders in English', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    await page.goto('/');
    await expectEnglishPage(page);
    await page.goto('/nimporte-quoi');
    await expectEnglishPage(page);
  });
});

test.describe('first visit', () => {
  test('is French whatever the browser language, and sets no cookie', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US', extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' } });
    const page = await context.newPage();
    for (const path of ['/', '/play', '/nimporte-quoi']) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    }
    expect(await localeCookie(context)).toBeUndefined();
    await context.close();
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the switch keeps the play page and the guest session', async ({ page, context }) => {
    await enterAsGuest(page, uniqueName());
    const token = await readSessionToken(context);
    await localeButton(page, 'en').click();
    await expect(page).toHaveURL('/play');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(await readSessionToken(context)).toBe(token);
  });

  test('the switch keeps the room address', async ({ page }) => {
    await enterAsGuest(page, uniqueName());
    const roomId = await createRoom(page);
    await localeButton(page, 'en').click();
    await expect(page).toHaveURL(new RegExp(`/rooms/${roomId}$`));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test.describe('footer in English', () => {
  const pages: [string, string][] = [['home', '/'], ['unknown address', '/nimporte-quoi'], ['unknown room', '/rooms/not-a-room']];
  for (const [label, path] of pages) {
    test(`${label} keeps the notice in both languages`, async ({ page, context }) => {
      await setLocaleCookie(context, 'en');
      await page.goto(path);
      const footer = page.getByRole('contentinfo');
      await expect(footer).toHaveCount(1);
      for (const [locale, messages] of [['fr', fr.Footer], ['en', en.Footer]] as const) {
        const block = footer.locator(`[lang="${locale}"]`);
        await expect(block).toHaveCount(1);
        for (const line of Object.values(messages)) await expect(block).toContainText(line);
      }
    });
  }
});

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe('layout at 320px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const locale of ['fr', 'en'] as const) {
    test(`play page and room have no horizontal scroll in ${locale}`, async ({ page, context }) => {
      await enterAsGuest(page, uniqueName());
      await createRoom(page);
      await setLocaleCookie(context, locale);
      await page.reload();
      await expectNoHorizontalScroll(page);
      await page.goto('/play');
      await expectNoHorizontalScroll(page);
    });
  }
});
