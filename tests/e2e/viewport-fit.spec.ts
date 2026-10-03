import { expect, test, type Locator, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { uniqueName } from './support/guests';
import { passageSegment, timer, typingArea } from './support/race';
import { fillRoomTo, openRoomAsNewGuest, startRaceInDatabase } from './support/rooms';
import { expectNoSpriteClipping, setPartnerOf } from './support/sprite-clipping';

const giratina = 487;

const longPassage = Array.from({ length: 12 }, () => 'Le garçon range ses crayons dans sa trousse.').join(' ');

async function expectInViewport(page: Page, locator: Locator, name: string): Promise<void> {
  const box = (await locator.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.y, `${name} top`).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height, `${name} bottom`).toBeLessThanOrEqual(viewport.height);
}

async function expectPageNotScrolled(page: Page): Promise<void> {
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
}

for (const viewport of [{ width: 1280, height: 720 }, { width: 1440, height: 900 }]) {
  test.describe(`one screen at ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    test('the race shows the leader bar, the map, the passage and the typing area without scrolling', async ({ page }) => {
      const host = uniqueName('Alex ');
      const roomId = await openRoomAsNewGuest(page, host);
      await setPartnerOf(host, giratina);
      await fillRoomTo(roomId, 6);
      await startRaceInDatabase(roomId, 0, { passage: longPassage });
      await expect(timer(page)).toHaveText(fr.Room.go, { timeout: 8_000 });
      await expect(typingArea(page)).toBeFocused();
      await page.screenshot({ path: `test-results/viewport-fit-race-${viewport.width}.png`, animations: 'disabled' });
      await expectPageNotScrolled(page);
      await expectInViewport(page, page.getByRole('region', { name: fr.Room.leaderBoard }), 'leader bar');
      await expectInViewport(page, page.locator('.route-scene'), 'race map');
      await expectInViewport(page, page.getByRole('region', { name: fr.Room.passageHeading }), 'passage');
      await expectInViewport(page, typingArea(page), 'typing area');
      await expectNoSpriteClipping(page, 1);

      await page.keyboard.type(longPassage.slice(0, 140));
      await expect(passageSegment(page, 'current')).toBeVisible();
      const passageWindow = (await page.locator('.passage-window').boundingBox())!;
      const caret = (await passageSegment(page, 'current').boundingBox())!;
      expect(caret.y).toBeGreaterThanOrEqual(passageWindow.y);
      expect(caret.y + caret.height).toBeLessThanOrEqual(passageWindow.y + passageWindow.height);
    });

    test('the lobby shows the room code and the start button without scrolling', async ({ page }) => {
      const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
      await fillRoomTo(roomId, 12);
      await page.reload();
      await page.screenshot({ path: `test-results/viewport-fit-lobby-${viewport.width}.png`, animations: 'disabled' });
      await expectPageNotScrolled(page);
      await expectInViewport(page, page.locator('.lobby-invite-code'), 'room code');
      await expectInViewport(page, page.getByRole('button', { name: fr.Room.startRace }), 'start button');
      await page.getByRole('region', { name: fr.Bots.panelTitle }).evaluate((panel) => panel.scrollIntoView({ block: 'end' }));
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await expectInViewport(page, page.getByRole('button', { name: fr.Room.startRace }), 'start button after scrolling');
    });
  });
}
