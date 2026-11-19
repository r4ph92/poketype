import { expect, test } from '@playwright/test';
import fr from '../../messages/fr.json';
import { enterAsGuest, uniqueName } from './support/guests';
import { timer, typingArea } from './support/race';
import { createRoom } from './support/rooms';
import { chooseStarterOnScreen } from './support/trainer';

test('scratch 74', async ({ browser, page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } }); });
  await enterAsGuest(page, uniqueName('Leo '));
  const roomId = await createRoom(page);
  await page.getByRole('button', { name: fr.Room.copyLink }).click();
  const link = await page.getByLabel(fr.Room.linkLabel).inputValue();
  const zoePage = await (await browser.newContext({ locale: 'fr-CA' })).newPage();
  await zoePage.goto(link);
  await zoePage.getByLabel(fr.GuestEntry.label).fill(uniqueName('Zoe '));
  await zoePage.getByRole('button', { name: fr.GuestEntry.submit }).click();
  await chooseStarterOnScreen(zoePage, 7);
  await page.getByRole('button', { name: fr.Room.startRace }).click();
  for (const shown of [page, zoePage]) await expect(timer(shown)).toHaveText(fr.Room.go, { timeout: 12_000 });
  const passage = (await page.locator('#passage-text').textContent())!;
  const missCounts: Record<string, number> = {};
  const wanted: Record<string, number> = { é: 4, s: 2 };
  const zoeTyping = (async () => {
    for (const ch of passage) {
      const want = wanted[ch.toLowerCase()] ?? 0;
      if (want > (missCounts[ch] ?? 0)) { missCounts[ch] = (missCounts[ch] ?? 0) + 1; await zoePage.keyboard.type('~', { delay: 40 }); }
      await zoePage.keyboard.type(ch, { delay: 40 });
    }
  })();
  await Promise.all([page.keyboard.type(passage, { delay: 40 }), zoeTyping]);
  console.log('missCounts', JSON.stringify(missCounts));
  const heading = fr.Room.missedKeysHeading;
  await expect(zoePage.getByRole('heading', { name: heading })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(fr.Room.missedKeysNone)).toBeVisible();
  console.log('LEO panel none: ok');
  const zoeList = await zoePage.getByRole('list', { name: heading }).innerText();
  console.log('ZOE list:', JSON.stringify(zoeList));
  const darkest = await zoePage.locator('.heat-keyboard .heat-key[data-heat="3"]').allInnerTexts();
  console.log('ZOE darkest keys:', JSON.stringify(darkest));
  await zoePage.getByLabel(fr.Room.missedKeysLayout, { exact: true }).selectOption('french-azerty');
  console.log('AZERTY darkest:', JSON.stringify(await zoePage.locator('.heat-keyboard .heat-key[data-heat="3"]').allInnerTexts()));
  await zoePage.screenshot({ path: '/tmp/zoe74.png', fullPage: true });
  // history address
  const raceId = (await zoePage.evaluate(() => document.querySelector('a[href*="/races/"]')?.getAttribute('href'))) ?? '';
  console.log('history href', raceId);
  if (raceId) {
    await zoePage.goto(raceId);
    await expect(zoePage.getByRole('heading', { name: heading })).toBeVisible();
    console.log('HISTORY list:', JSON.stringify(await zoePage.getByRole('list', { name: heading }).innerText()));
    await zoePage.goto(raceId.replace(/\/$/, ''));
  }
  // English
  await zoePage.context().addCookies([{ name: 'poketype_locale', value: 'en', url: 'http://localhost:3974' }]);
  if (raceId) { await zoePage.goto(raceId); console.log('EN heading visible:', await zoePage.getByRole('heading', { name: 'Most missed keys' }).isVisible()); }
});
