import { expect, test, type Page } from '@playwright/test';
import { passageLength } from '../../src/domain/passage';
import { measureRacer } from '../../src/domain/race-results';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { commitOpenComposition, dispatchSafariComposition, pressDeadKey, readRejectedEverShown, typeThroughComposition, watchRejectedMarks } from './support/composition';
import { passageFragments, passageSegment, typingArea } from './support/race';
import { readCountersOf } from './support/rooms';
import { readSettledRace } from './support/settlement';
import { resultsTable } from './support/results';
import { racerRow, startTwoPlayerRace } from './support/typing';

const accentPassage = 'Zoé était là, près du hêtre où le garçon a vu un cœur.';
const typingDelayMs = 60;

// Letters typed through a dead key or a macOS Option combination, with the accent the keyboard shows while composing.
const canadianFrenchDeadKeys = { ê: '^' };
const usInternationalDeadKeys = { é: '´', è: '`', à: '`', ù: '`', ê: '^' };

async function typeWithDeadKeys(page: Page, text: string, deadKeyAccents: Readonly<Record<string, string>>): Promise<void> {
  for (const character of Array.from(text)) {
    const accent = deadKeyAccents[character];
    if (accent) await typeThroughComposition(page, accent, character);
    else await page.keyboard.type(character);
    await page.waitForTimeout(typingDelayMs);
  }
}

function positionAfter(fragment: string): number {
  return accentPassage.indexOf(fragment) + fragment.length;
}

async function expectProgress(page: Page, roomId: string, trainerName: string, position: number): Promise<void> {
  await expect(passageSegment(page, 'typed')).toHaveText(accentPassage.slice(0, position));
  await expect.poll(() => readCountersOf(roomId, trainerName)).toEqual({ position, keystrokes: position, rejectedKeystrokes: 0 });
}

test.describe('typing French accents and ç', () => {
  test('é from a dedicated key, a dead key or a macOS Option combination is one correct character, and the dead key alone shows no error', async ({ browser, page }) => {
    const { zoePage, roomId, zoe } = await startTwoPlayerRace(browser, page, accentPassage);
    await watchRejectedMarks(zoePage);

    await zoePage.keyboard.type('Zoé', { delay: typingDelayMs });
    await expectProgress(zoePage, roomId, zoe, 3);
    await zoePage.keyboard.type(' ');

    await pressDeadKey(zoePage, '´');
    await expect(typingArea(zoePage)).toHaveValue('´');
    await zoePage.waitForTimeout(600);
    await expect(passageSegment(zoePage, 'current')).toHaveText('é');
    await expect.poll(() => readCountersOf(roomId, zoe)).toEqual({ position: 4, keystrokes: 4, rejectedKeystrokes: 0 });
    await commitOpenComposition(zoePage, 'é');
    await expectProgress(zoePage, roomId, zoe, 5);
    await expect(typingArea(zoePage)).toHaveValue('');

    await typeWithDeadKeys(zoePage, 'tait là, près du h', {});
    await typeThroughComposition(zoePage, '^', 'ê');
    await expectProgress(zoePage, roomId, zoe, positionAfter('hê'));
    expect(await readRejectedEverShown(zoePage)).toBe(false);
    await zoePage.context().close();
  });

  test('ç, à, ù, ê and œ are accepted composed or decomposed, and Safari\'s second commit is not counted twice', async ({ browser, page }) => {
    const { zoePage, roomId, zoe } = await startTwoPlayerRace(browser, page, accentPassage);

    await typeWithDeadKeys(zoePage, 'Zo', {});
    await zoePage.keyboard.insertText('é');
    await expectProgress(zoePage, roomId, zoe, 3);
    await typeWithDeadKeys(zoePage, ' était l', {});
    await typeThroughComposition(zoePage, '`', 'à');
    await expectProgress(zoePage, roomId, zoe, positionAfter('là'));
    await typeWithDeadKeys(zoePage, ', près du h', {});
    await dispatchSafariComposition(zoePage, '^', 'ê');
    await expectProgress(zoePage, roomId, zoe, positionAfter('hê'));
    await typeWithDeadKeys(zoePage, 'tre o', {});
    await typeThroughComposition(zoePage, '`', 'ù');
    await typeWithDeadKeys(zoePage, ' le gar', {});
    await zoePage.keyboard.insertText('ç');
    await typeWithDeadKeys(zoePage, 'on a vu un c', {});
    await zoePage.keyboard.type('œ');
    await expectProgress(zoePage, roomId, zoe, positionAfter('cœ'));
    await zoePage.context().close();
  });

  test('a plain e where é is expected is wrong: it flashes red, adds nothing, and every visible string stays French', async ({ browser, page }) => {
    const { alexPage, zoePage, roomId, alex, zoe } = await startTwoPlayerRace(browser, page, accentPassage);

    await zoePage.keyboard.type('Zoe', { delay: typingDelayMs });
    await expect(passageSegment(zoePage, 'typed')).toHaveText('Zo');
    await expect(passageSegment(zoePage, 'rejected')).toHaveText('é');
    await expect.poll(() => readCountersOf(roomId, zoe)).toEqual({ position: 2, keystrokes: 3, rejectedKeystrokes: 1 });
    await expect(zoePage.locator('html')).toHaveAttribute('lang', 'fr');
    await expectEveryVisibleStringFromCatalog(zoePage, [alex, zoe, ...passageFragments(accentPassage)]);

    await typeThroughComposition(zoePage, '´', 'é');
    await expect(passageSegment(zoePage, 'typed')).toHaveText('Zoé');
    await expect(passageSegment(zoePage, 'rejected')).toHaveCount(0);
    await expect(racerRow(alexPage, zoe)).toBeVisible();
    await zoePage.context().close();
  });

  test('a race with accented words renders the same accents in both browsers and scores each accented letter as one character', async ({ browser, page }) => {
    const { alexPage, zoePage, roomId, alex, zoe } = await startTwoPlayerRace(browser, page, accentPassage);
    for (const shown of [alexPage, zoePage]) {
      await expect(shown.locator('#passage-text')).toHaveText(accentPassage);
      await expect(shown.locator('#passage-heading + p')).toHaveText(accentPassage);
    }

    await Promise.all([typeWithDeadKeys(zoePage, accentPassage, canadianFrenchDeadKeys), typeWithDeadKeys(alexPage, accentPassage, usInternationalDeadKeys)]);

    for (const shown of [alexPage, zoePage]) await expect(resultsTable(shown)).toBeVisible({ timeout: 4_000 });
    const length = passageLength(accentPassage);
    expect(length).toBeLessThan(accentPassage.normalize('NFD').length);
    for (const result of (await readSettledRace(roomId)).results) {
      expect([alex, zoe]).toContain(result.trainerName);
      const expected = measureRacer({ typedCharacters: length, keystrokes: length, rejectedKeystrokes: 0, elapsedMs: result.finishMs! });
      expect(result.rejectedKeystrokes).toBe(0);
      expect(result.grossWpm!).toBeCloseTo(expected.grossWpm, 1);
    }
    await zoePage.context().close();
  });
});
