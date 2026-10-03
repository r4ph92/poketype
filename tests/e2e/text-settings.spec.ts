import { expect, test, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { gameConfig } from '../../src/config/game';
import { expectNoAccessibilityViolations } from './support/axe';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { uniqueName, withTestDatabase } from './support/guests';
import { timer } from './support/race';
import { newGuestPage, openRoomAsNewGuest, playerRows, readRoomCode, readRoomRaces, roomPagePath } from './support/rooms';

const liveUpdateMs = 2_000;
const raceOpensWithinMs = 8_000;

const settingsPanel = (page: Page) => page.getByRole('region', { name: fr.TextSettings.title });
const summaryValue = (page: Page, label: string) => settingsPanel(page).locator('dl > div').filter({ has: page.getByText(label, { exact: true }) }).locator('dd');
const lengthText = (count: number) => fr.TextSettings.lengthValue.replace('{count}', String(count));

async function roomWithZoe(page: Page, browser: Parameters<typeof newGuestPage>[0]) {
  const alex = uniqueName('Alex ');
  const zoe = uniqueName('Zoé ');
  const roomId = await openRoomAsNewGuest(page, alex);
  const zoePage = await newGuestPage(browser, zoe);
  await zoePage.goto(roomPagePath(roomId));
  await expect(playerRows(page)).toHaveCount(2);
  return { roomId, zoePage, alex, zoe };
}

async function readStoredSettings(roomId: string) {
  const [row] = await withTestDatabase((sql) => sql`select text_language, text_length, text_punctuation, text_digits from rooms where id = ${roomId}`);
  return row;
}

test.describe('race text settings in the lobby', () => {
  test('a French host starts with French and the default settings; Zoe sees them but cannot change them', async ({ browser, page }) => {
    const { roomId, zoePage, alex, zoe } = await roomWithZoe(page, browser);
    const panel = settingsPanel(page);

    await expect(panel.getByRole('radio', { name: fr.TextSettings.fr })).toBeChecked();
    await expect(panel.getByRole('radio', { name: fr.TextSettings.short })).toBeChecked();
    await expect(panel.getByRole('slider', { name: fr.TextSettings.lengthSlider })).toHaveValue(String(gameConfig.text.defaultLength));
    await expect(panel.getByRole('checkbox', { name: fr.TextSettings.punctuation })).toBeChecked();
    await expect(panel.getByRole('checkbox', { name: fr.TextSettings.digits })).not.toBeChecked();
    await expect(settingsPanel(zoePage).getByRole('radio')).toHaveCount(0);
    await expect(settingsPanel(zoePage).getByRole('checkbox')).toHaveCount(0);
    await expect(summaryValue(zoePage, fr.TextSettings.languageLegend)).toHaveText(fr.TextSettings.fr);
    await expect(summaryValue(zoePage, fr.TextSettings.lengthLegend)).toHaveText(lengthText(gameConfig.text.defaultLength));

    const code = await readRoomCode(roomId);
    await expectEveryVisibleStringFromCatalog(page, [alex, zoe, code]);
    await expectEveryVisibleStringFromCatalog(zoePage, [alex, zoe, code]);
    await zoePage.context().close();
  });

  test('the host changes language, length and options; Zoe sees each change live and the server stores it', async ({ browser, page }) => {
    const { roomId, zoePage } = await roomWithZoe(page, browser);
    const panel = settingsPanel(page);

    await panel.getByRole('radio', { name: fr.TextSettings.en }).check();
    await panel.getByRole('radio', { name: fr.TextSettings.long }).check();
    await panel.getByRole('checkbox', { name: fr.TextSettings.punctuation }).uncheck();
    await panel.getByRole('checkbox', { name: fr.TextSettings.digits }).check();
    await expect(panel.getByRole('checkbox', { name: fr.TextSettings.accents })).toBeDisabled();

    await expect(summaryValue(zoePage, fr.TextSettings.languageLegend)).toHaveText(fr.TextSettings.en, { timeout: liveUpdateMs });
    await expect(summaryValue(zoePage, fr.TextSettings.lengthLegend)).toHaveText(lengthText(700));
    await expect(summaryValue(zoePage, fr.TextSettings.punctuation)).toHaveText(fr.TextSettings.optionOff);
    await expect(summaryValue(zoePage, fr.TextSettings.digits)).toHaveText(fr.TextSettings.optionOn);
    await expect(settingsPanel(zoePage).getByText(fr.TextSettings.accents, { exact: true })).toHaveCount(0);
    expect(await readStoredSettings(roomId)).toEqual({ text_language: 'en', text_length: 700, text_punctuation: false, text_digits: true });

    await panel.getByRole('slider', { name: fr.TextSettings.lengthSlider }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(panel.getByRole('radio', { name: fr.TextSettings.long })).not.toBeChecked();
    await expect(summaryValue(zoePage, fr.TextSettings.lengthLegend)).toHaveText(lengthText(750), { timeout: liveUpdateMs });
    await zoePage.context().close();
  });

  test('the race types an English text of the chosen length, the same for both players, marked as English', async ({ browser, page }) => {
    const { roomId, zoePage } = await roomWithZoe(page, browser);
    const panel = settingsPanel(page);
    await panel.getByRole('radio', { name: fr.TextSettings.en }).check();
    await expect(summaryValue(zoePage, fr.TextSettings.languageLegend)).toHaveText(fr.TextSettings.en, { timeout: liveUpdateMs });

    await page.getByRole('button', { name: fr.Room.startRace }).click();
    for (const shown of [page, zoePage]) await expect(timer(shown)).toHaveText(fr.Room.go, { timeout: raceOpensWithinMs });
    const [race] = await readRoomRaces(roomId);
    expect(Array.from(race!.passage).length).toBeLessThanOrEqual(gameConfig.text.defaultLength);
    for (const shown of [page, zoePage]) {
      const plainCopy = shown.locator('#passage-text');
      await expect(plainCopy).toHaveText(race!.passage);
      await expect(plainCopy).toHaveAttribute('lang', 'en');
    }
    await zoePage.context().close();
  });

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`the host's settings and removal controls meet WCAG AA in the ${colorScheme} theme`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme });
      const page = await context.newPage();
      const { zoePage } = await roomWithZoe(page, browser);
      await expect(settingsPanel(page).getByRole('slider')).toBeVisible();
      await expectNoAccessibilityViolations(page);
      await expectNoAccessibilityViolations(zoePage);
      await zoePage.context().close();
      await context.close();
    });
  }
});
