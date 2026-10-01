import { expect, test } from '@playwright/test';
import fr from '../../messages/fr.json';
import { passageLength } from '../../src/domain/passage';
import { progressPercent } from '../../src/domain/typing-progress';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { passageFragments, passageSegment, readRosterChanges, readTrueEpochNow, readTypedLengths, typingArea } from './support/race';
import { readParticipants, testPassage } from './support/rooms';
import { percentText, racerRow, startTwoPlayerRace } from './support/typing';

const fullLength = passageLength(testPassage);
const typingDelayMs = 80;

test.describe('typing the passage', () => {
  test('a correct character turns green, raises the percentage, and the rival sees it within 1 second', async ({ browser, page }) => {
    const { alexPage, zoePage, zoe } = await startTwoPlayerRace(browser, page);
    await expect(typingArea(zoePage)).toBeFocused();

    await zoePage.keyboard.type(testPassage.slice(0, 4), { delay: typingDelayMs });
    const typedAt = await readTrueEpochNow(zoePage);
    await zoePage.keyboard.type(testPassage.slice(4, 5));

    await expect(passageSegment(zoePage, 'typed')).toHaveText(testPassage.slice(0, 5));
    await expect(passageSegment(zoePage, 'current')).toHaveText(testPassage[5]!);
    const expected = percentText(progressPercent(5, fullLength));
    await expect(racerRow(zoePage, zoe)).toContainText(expected);
    await expect(racerRow(alexPage, zoe)).toContainText(expected);
    const seenAt = (await readRosterChanges(alexPage)).find((change) => change.rows.some((row) => row === `${zoe}${expected}`))!.at;
    expect(seenAt - typedAt).toBeLessThan(1_000);
    await zoePage.context().close();
  });

  test('a wrong character marks the expected one wrong, adds nothing, and only the expected character advances', async ({ browser, page }) => {
    const { zoePage, roomId, zoe } = await startTwoPlayerRace(browser, page);

    await zoePage.keyboard.type('Lex', { delay: typingDelayMs });
    await expect(passageSegment(zoePage, 'typed')).toHaveText('Le');
    await expect(passageSegment(zoePage, 'rejected')).toHaveText('·');
    await expect(racerRow(zoePage, zoe)).toContainText(percentText(progressPercent(2, fullLength)));
    await expect.poll(async () => (await readParticipants(roomId)).find((row) => row.position === 2)?.rejectedKeystrokes).toBe(1);

    await zoePage.keyboard.type('y');
    await expect(passageSegment(zoePage, 'typed')).toHaveText('Le');
    await zoePage.keyboard.type(' ');
    await expect(passageSegment(zoePage, 'typed')).toHaveText('Le ');
    await expect(passageSegment(zoePage, 'current')).toHaveText('g');
    await expect(passageSegment(zoePage, 'rejected')).toHaveCount(0);
    await zoePage.context().close();
  });

  test('pasting or dropping text adds nothing and sends no progress', async ({ browser, page }) => {
    const { zoePage, roomId } = await startTwoPlayerRace(browser, page);
    await zoePage.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const reports: string[] = [];
    zoePage.on('request', (request) => {
      if (request.url().endsWith('/progress')) reports.push(request.url());
    });

    await zoePage.evaluate((text) => navigator.clipboard.writeText(text), testPassage);
    await zoePage.keyboard.press('ControlOrMeta+V');
    await typingArea(zoePage).evaluate((field, text) => {
      const transfer = new DataTransfer();
      transfer.setData('text/plain', text);
      field.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
      field.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }));
      field.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertFromDrop', data: text, bubbles: true, cancelable: true }));
      field.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertFromPaste', data: text, bubbles: true, cancelable: true }));
    }, testPassage);
    await zoePage.waitForTimeout(1_000);

    await expect(passageSegment(zoePage, 'typed')).toHaveText('');
    await expect(typingArea(zoePage)).toHaveValue('');
    expect(reports).toEqual([]);
    expect((await readParticipants(roomId)).every((row) => row.position === 0 && row.keystrokes === 0)).toBe(true);
    await zoePage.context().close();
  });

  test('the last character shows "Terminé" with the finish time, closes the typing area, and the rival keeps racing', async ({ browser, page }) => {
    const { alexPage, zoePage, roomId, alex, zoe } = await startTwoPlayerRace(browser, page);

    await zoePage.keyboard.type(testPassage, { delay: typingDelayMs });
    await expect(racerRow(zoePage, zoe)).toContainText(fr.Room.finished);
    await expect(racerRow(zoePage, zoe)).toContainText(/\d+,\d s$/);
    await expect(typingArea(zoePage)).not.toBeEditable();
    await expect(typingArea(zoePage)).toHaveAttribute('aria-disabled', 'true');
    await expect(racerRow(alexPage, zoe)).toContainText(fr.Room.finished, { timeout: 2_000 });
    const stored = (await readParticipants(roomId)).find((row) => row.position === fullLength)!;
    expect(stored.finishedAt).not.toBeNull();

    await zoePage.keyboard.type('encore');
    await zoePage.waitForTimeout(600);
    expect((await readParticipants(roomId)).find((row) => row.guestId === stored.guestId)!.keystrokes).toBe(stored.keystrokes);
    const typedLengths = await readTypedLengths(zoePage);
    expect(typedLengths).toEqual([...typedLengths].sort((first, second) => first - second));

    await alexPage.keyboard.type('Le', { delay: typingDelayMs });
    const alexPercent = percentText(progressPercent(2, fullLength));
    await expect(racerRow(alexPage, alex)).toContainText(alexPercent);
    await expect(racerRow(zoePage, alex)).toContainText(alexPercent, { timeout: 2_000 });
    await zoePage.context().close();
  });

  test('in French, every visible string of the race and the finish comes from the catalog', async ({ browser, page }) => {
    const { alexPage, zoePage, alex, zoe } = await startTwoPlayerRace(browser, page);
    const userTexts = [alex, zoe, ...passageFragments(testPassage)];

    await zoePage.keyboard.type('Lex', { delay: typingDelayMs });
    for (const shown of [alexPage, zoePage]) {
      await expect(shown.locator('html')).toHaveAttribute('lang', 'fr');
      await expectEveryVisibleStringFromCatalog(shown, userTexts);
    }
    await zoePage.keyboard.type(testPassage.slice(2), { delay: typingDelayMs });
    await expect(racerRow(zoePage, zoe)).toContainText(/\d+,\d s$/);
    await expect(racerRow(alexPage, zoe)).toContainText(fr.Room.finished, { timeout: 2_000 });
    for (const shown of [alexPage, zoePage]) await expectEveryVisibleStringFromCatalog(shown, userTexts);
    await zoePage.context().close();
  });
});
