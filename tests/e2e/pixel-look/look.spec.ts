import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import fr from '../../../messages/fr.json';
import { startAppServer, type AppServer } from '../support/app-server';
import { themeColors, type Rgb } from '../support/contrast';
import { uniqueName } from '../support/guests';
import { openState, pageStates } from '../support/pixel-states';
import { startSwitchableDatabase, type SwitchableDatabase } from '../support/switchable-database';

type PanelStyle = { borderWidth: string; borderColor: string; background: string; clipPath: string };

const colors = themeColors();

function cssRgb(name: string): string {
  const [red, green, blue] = colors.get(name) as Rgb;
  return `rgb(${red}, ${green}, ${blue})`;
}

async function expectSharedHeader(page: Page, { hasAccountNav }: { hasAccountNav: boolean }): Promise<void> {
  const banner = page.getByRole('banner');
  await expect(banner).toHaveCount(1);
  await expect(banner.getByRole('link', { name: fr.Header.wordmark })).toHaveAttribute('href', '/');
  await expect(banner.getByRole('navigation', { name: fr.Header.navLabel })).toBeVisible();
  await expect(banner.getByRole('group', { name: fr.LocaleSwitch.label })).toBeVisible();
  await expect(banner.getByRole('navigation', { name: fr.AccountBar.label })).toHaveCount(hasAccountNav ? 1 : 0);
}

async function outermostPanelStyles(page: Page): Promise<PanelStyle[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('main section')]
      .filter((section) => !section.parentElement?.closest('section'))
      .map((section) => {
        const style = getComputedStyle(section);
        return { borderWidth: style.borderTopWidth, borderColor: style.borderTopColor, background: style.backgroundColor, clipPath: style.clipPath };
      }),
  );
}

async function expectPanelsOnSage(page: Page): Promise<void> {
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(cssRgb('sage'));
  const panels = await outermostPanelStyles(page);
  expect(panels.length).toBeGreaterThan(0);
  for (const panel of panels) {
    expect(panel).toMatchObject({ borderWidth: '4px', borderColor: cssRgb('frame'), background: cssRgb('cream') });
    expect(panel.clipPath).not.toBe('none');
  }
}

async function goldOutsideSelectedThings(page: Page): Promise<string[]> {
  return page.evaluate(
    ({ gold, youMarker }) =>
      [...document.querySelectorAll('body *')]
        .filter((element) => getComputedStyle(element).backgroundColor === gold)
        .filter((element) => !element.closest('[aria-current], [data-state="current"]') && !(element.matches('li') && element.textContent?.includes(youMarker)))
        .map((element) => element.outerHTML.slice(0, 120)),
    { gold: cssRgb('gold'), youMarker: fr.Room.youMarker },
  );
}

async function interfaceImages(page: Page): Promise<number> {
  return page.evaluate(
    () => document.querySelectorAll('img').length + [...document.querySelectorAll('body *')].filter((element) => getComputedStyle(element).backgroundImage !== 'none').length,
  );
}

test.describe('one retro look on every page', () => {
  for (const state of pageStates) {
    test(`${state.name}: shared header, cream panels on sage, gold only for the selected thing, no image as interface`, async ({ browser }) => {
      const { page } = await openState(browser, state);
      if (state.isNotFound) expect((await page.request.get(page.url())).status()).toBe(404);
      await expectSharedHeader(page, { hasAccountNav: true });
      await expectPanelsOnSage(page);
      expect(await goldOutsideSelectedThings(page)).toEqual([]);
      expect(await interfaceImages(page)).toBe(0);
      await page.context().close();
    });
  }
});

const outageServerPort = Number(process.env.E2E_PORT ?? 3100) + 3;
const outageServerUrl = `http://localhost:${outageServerPort}`;
const productionBuildExists = existsSync(path.join(process.cwd(), '.next', 'BUILD_ID'));

test.describe('separate production server: header during a database outage', () => {
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

  test('the error page keeps the header and the language switch, without the account navigation', async ({ page }) => {
    await page.goto(`${outageServerUrl}/`);
    await page.getByLabel(fr.GuestEntry.label).fill(uniqueName('Panne '));
    await page.getByRole('button', { name: fr.GuestEntry.submit }).click();
    await expect(page).toHaveURL(`${outageServerUrl}/play`);
    database.setAvailable(false);
    try {
      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.ServerError.heading);
      await expectSharedHeader(page, { hasAccountNav: false });
    } finally {
      database.setAvailable(true);
    }
  });
});
