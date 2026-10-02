import { expect, test, type Page } from '@playwright/test';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { uniquePassword, uniqueUsername } from './support/accounts';
import { expectNoAccessibilityViolations } from './support/axe';
import { parseCssColor, sameColor, themeColors, type Rgb } from './support/contrast';
import { enterAsGuest, uniqueName } from './support/guests';
import { passageSegment, typingArea } from './support/race';
import { fillLogIn, logInAlert, throttledMessage } from './support/login';
import { resultsTable } from './support/results';
import { newGuestPage, openRoomAsNewGuest, playerRows, roomPagePath, startRaceInDatabase, testPassage } from './support/rooms';
import { finishRaceInDatabase } from './support/settlement';
import { racerRow } from './support/typing';

const storageKey = 'poketype-theme';
const dark = themeColors('dark');
const light = themeColors('light');

const html = (page: Page) => page.locator('html');
const themeButton = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function openSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: fr.Header.settings, exact: true }).click();
}

async function chooseTheme(page: Page, name: string): Promise<void> {
  await openSettings(page);
  await themeButton(page, name).click();
  await page.keyboard.press('Escape');
}

async function computed(page: Page, selector: string, property: string): Promise<Rgb> {
  const value = await page.locator(selector).first().evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);
  return parseCssColor(value);
}

async function expectPaletteOf(page: Page, palette: Map<string, Rgb>): Promise<void> {
  expect(sameColor(await computed(page, 'body', 'background-color'), palette.get('sage')!)).toBe(true);
  expect(sameColor(await computed(page, 'body', 'color'), palette.get('ink')!)).toBe(true);
}

test.describe('choosing a theme', () => {
  test('Sombre switches every page to the dark palette and keeps the gold highlight and pixel border', async ({ page }) => {
    await enterAsGuest(page, uniqueName('Zoe '));
    await expectPaletteOf(page, light);
    await openSettings(page);
    await themeButton(page, fr.ThemeSwitch.names.dark).click();

    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await expect(themeButton(page, fr.ThemeSwitch.names.dark)).toHaveAttribute('aria-pressed', 'true');
    await expectPaletteOf(page, dark);
    const darkFace = themeButton(page, fr.ThemeSwitch.names.dark).locator('span');
    expect(sameColor(await computed(page, '[data-theme-choice="dark"] span', 'background-color'), dark.get('gold')!)).toBe(true);
    expect(sameColor(await computed(page, '[data-theme-choice="dark"] span', 'border-top-color'), dark.get('frame')!)).toBe(true);
    await expect(darkFace).toBeVisible();
    await page.keyboard.press('Escape');

    for (const path of ['/', '/play', '/signup']) {
      await page.goto(path);
      await expect(html(page)).toHaveAttribute('data-theme', 'dark');
      await expectPaletteOf(page, dark);
    }
  });

  test('a stored choice survives a reload and a new page, and Système returns to the system setting', async ({ page }) => {
    await enterAsGuest(page, uniqueName('Zoe '));
    await chooseTheme(page, fr.ThemeSwitch.names.dark);
    await page.reload();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await expectPaletteOf(page, dark);

    const another = await page.context().newPage();
    await another.goto('/play');
    await expect(html(another)).toHaveAttribute('data-theme', 'dark');
    await expectPaletteOf(another, dark);

    await chooseTheme(page, fr.ThemeSwitch.names.system);
    await expect(html(page)).not.toHaveAttribute('data-theme', /.+/);
    expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBeNull();
  });

  test('another open tab follows the change', async ({ page }) => {
    await enterAsGuest(page, uniqueName('Zoe '));
    const other = await page.context().newPage();
    await other.goto('/play');
    await chooseTheme(page, fr.ThemeSwitch.names.dark);
    await expect(html(other)).toHaveAttribute('data-theme', 'dark');
  });

  test('a stored light choice wins over a dark system setting', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    await context.addInitScript((key) => localStorage.setItem(key, 'light'), storageKey);
    const page = await context.newPage();
    await page.goto('/');
    await expectPaletteOf(page, light);
    await context.close();
  });

  for (const scheme of ['dark', 'light'] as const) {
    test(`with no choice the page follows a ${scheme} system setting`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: scheme });
      const page = await context.newPage();
      await page.goto('/');
      await expect(html(page)).not.toHaveAttribute('data-theme', /.+/);
      await expectPaletteOf(page, scheme === 'dark' ? dark : light);
      await context.close();
    });
  }

  test('with blocked local storage the page renders, the switch works for the visit and nothing errors', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    const page = await context.newPage();
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(error.message));
    page.on('console', (message) => message.type() === 'error' && problems.push(message.text()));
    await page.goto('/');
    await openSettings(page);
    await themeButton(page, fr.ThemeSwitch.names.dark).click();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await expectPaletteOf(page, dark);
    await themeButton(page, fr.ThemeSwitch.names.light).click();
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
    expect(problems).toEqual([]);
    await context.close();
  });

  test('the options read Clair, Sombre and Système in French and Light, Dark and System in English', async ({ page }) => {
    await page.goto('/');
    await openSettings(page);
    expect(await page.locator('[data-theme-choice]').allTextContents()).toEqual(['Clair', 'Sombre', 'Système']);
    expect(Object.values(fr.ThemeSwitch.names)).toEqual(['Clair', 'Sombre', 'Système']);
    expect(Object.values(en.ThemeSwitch.names)).toEqual(['Light', 'Dark', 'System']);
  });
});

test.describe('the dark theme', () => {
  test.use({ colorScheme: 'dark' });

  async function checkPage(page: Page, name: string): Promise<void> {
    await expectNoAccessibilityViolations(page);
    await page.screenshot({ path: `docs/design-captures/dark-${name}.png`, fullPage: true, animations: 'disabled' });
  }

  test('home, play and signup meet contrast', async ({ page }) => {
    await page.goto('/');
    await checkPage(page, 'home');
    await enterAsGuest(page, uniqueName('Zoe '));
    await checkPage(page, 'play');
    await page.goto('/signup');
    await checkPage(page, 'signup');
  });

  test('waiting room, race, spectator banner and results with an Abandon row meet contrast and a wrong character has a non-colour cue', async ({ browser, page }) => {
    const alex = uniqueName('Alex ');
    const zoe = uniqueName('Zoé ');
    const roomId = await openRoomAsNewGuest(page, alex);
    const zoePage = await newGuestPage(browser, zoe, async (context) => {
      await context.addInitScript((key) => localStorage.setItem(key, 'dark'), storageKey);
    });
    await zoePage.goto(roomPagePath(roomId));
    await expect(playerRows(page)).toHaveCount(2);
    await expect(page.getByRole('button', { name: fr.Room.leaveRoom })).toBeVisible();
    await checkPage(page, 'waiting-room');

    await startRaceInDatabase(roomId, 2_000);
    await expect(typingArea(page)).toBeEditable({ timeout: 8_000 });
    await page.keyboard.type(testPassage.slice(0, 2));
    await page.keyboard.type('#');
    await expect(passageSegment(page, 'rejected')).toBeVisible();
    expect(await rejectedDecoration(page)).toEqual({ line: 'underline', style: 'wavy' });
    await expect(page.getByRole('button', { name: fr.Room.abandonRace })).toBeVisible();
    await expect(page.getByRole('timer')).toBeVisible();
    await checkPage(page, 'race');

    await abandonRace(zoePage);
    await expect(zoePage.getByText(fr.Room.abandonedBanner)).toBeVisible();
    await expectNoAccessibilityViolations(zoePage);
    await expect(racerRow(page, zoe).getByText(fr.Room.abandoned)).toBeVisible({ timeout: 4_000 });
    await expectNoAccessibilityViolations(page);

    await finishRaceInDatabase(roomId, [{ trainerName: alex, elapsedMs: 30_000, rejectedKeystrokes: 1 }]);
    await expect(resultsTable(page)).toBeVisible({ timeout: 4_000 });
    await expect(resultsTable(page).getByText(fr.Room.abandoned)).toBeVisible();
    await checkPage(page, 'results');
    await zoePage.context().close();
  });

  test('log in form and the throttle message meet contrast', async ({ page }) => {
    const username = uniqueUsername('Theme_');
    await page.goto('/login');
    await checkPage(page, 'log-in');
    for (let attempt = 1; attempt <= 6; attempt += 1) await fillLogIn(page, username, uniquePassword());
    await expect(logInAlert(page)).toHaveText(throttledMessage());
    await expectNoAccessibilityViolations(page);
  });
});

async function abandonRace(page: Page): Promise<void> {
  await page.getByRole('button', { name: fr.Room.abandonRace }).click();
  await page.getByRole('dialog', { name: fr.Room.abandonTitle }).getByRole('button', { name: fr.Room.confirmAbandon }).click();
}

async function rejectedDecoration(page: Page): Promise<{ line: string; style: string }> {
  return passageSegment(page, 'rejected').evaluate((element) => {
    const style = getComputedStyle(element);
    return { line: style.textDecorationLine, style: style.textDecorationStyle };
  });
}
