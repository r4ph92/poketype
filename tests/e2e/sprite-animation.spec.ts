import { expect, test } from '@playwright/test';
import fr from '../../messages/fr.json';
import { enterAsGuest, uniqueName } from './support/guests';
import { expectNoAccessibilityViolations } from './support/axe';
import { createRoom, newGuestPage } from './support/rooms';
import { timer, typingArea } from './support/race';

async function frameTransform(image: import('@playwright/test').Locator) {
  return image.evaluate((element) => getComputedStyle(element).transform);
}

test('real sheets animate, pause, resume, and respect reduced motion', async ({ page }) => {
  await page.goto('/credits');
  const sheet = page.locator('[data-species="charmander"][data-action="walk"] img');
  await expect(sheet).toBeVisible();
  await expect.poll(() => sheet.evaluate((element) => getComputedStyle(element).animationPlayState)).toBe('running');
  const initial = await frameTransform(sheet);
  await expect.poll(() => frameTransform(sheet)).not.toBe(initial);
  await page.getByRole('button', { name: fr.Animation.pause }).click();
  const frozen = await frameTransform(sheet);
  await page.waitForTimeout(300);
  expect(await frameTransform(sheet)).toBe(frozen);
  await page.getByRole('button', { name: fr.Animation.resume }).click();
  await expect.poll(() => frameTransform(sheet)).not.toBe(frozen);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => sheet.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  await expect(page.getByRole('button', { name: fr.Animation.reduced })).toBeDisabled();
  await expectNoAccessibilityViolations(page);
});

test('racers stay still unless correct typing advances them, consistently in both browsers', async ({ browser }) => {
  const host = await newGuestPage(browser, 'Alex sprites');
  const roomId = await createRoom(host);
  const rival = await newGuestPage(browser, 'Zoe sprites');
  await rival.goto(`/rooms/${roomId}`);
  await expect(host.locator('[data-racer]')).toHaveCount(2);
  const assignments = async (page: typeof host) => page.locator('[data-racer]').evaluateAll((racers) => racers.map((racer) => ({ key: racer.getAttribute('data-racer'), species: racer.querySelector('[data-species]')?.getAttribute('data-species') })));
  expect(await assignments(host)).toEqual(await assignments(rival));
  const before = await assignments(host);
  await host.getByRole('button', { name: fr.Room.startRace }).click();
  await expect(timer(host)).toHaveText(fr.Room.go, { timeout: 8000 });
  await expect(typingArea(host)).toBeFocused();
  const marker = host.locator('[data-racer][data-viewer="true"]');
  const rivalViewOfHost = rival.locator(`[data-racer="${await marker.getAttribute('data-racer')}"]`);
  const position = (racer: typeof marker) => racer.evaluate((element) => ({ left: (element as HTMLElement).style.left, top: (element as HTMLElement).style.top }));
  const expectStationary = async () => {
    await expect(marker.locator('.pokemon-sheet')).toHaveCSS('animation-play-state', 'paused');
    await expect(rivalViewOfHost.locator('.pokemon-sheet')).toHaveCSS('animation-play-state', 'paused');
    const localPosition = await position(marker);
    const remotePosition = await position(rivalViewOfHost);
    const localFrame = await frameTransform(marker.locator('.pokemon-sheet'));
    const remoteFrame = await frameTransform(rivalViewOfHost.locator('.pokemon-sheet'));
    // Longer than animation cycles and several polling intervals: no background advance or idle motion.
    await host.waitForTimeout(1000);
    expect(await position(marker)).toEqual(localPosition);
    expect(await position(rivalViewOfHost)).toEqual(remotePosition);
    expect(await frameTransform(marker.locator('.pokemon-sheet'))).toBe(localFrame);
    expect(await frameTransform(rivalViewOfHost.locator('.pokemon-sheet'))).toBe(remoteFrame);
  };
  await expectStationary();
  const start = await position(marker);
  const passage = (await host.locator('#passage-text').textContent())!;
  const wrong = passage[0] === '#' ? '@' : '#';
  await host.keyboard.type(wrong.repeat(3), { delay: 50 });
  await host.keyboard.press('Backspace');
  await expectStationary();
  expect(await position(marker)).toEqual(start);
  expect(await position(rivalViewOfHost)).toEqual(start);
  await host.keyboard.type(passage.slice(0, 3), { delay: 50 });
  await expect(marker.locator('[data-action="walk"]')).toHaveCount(1);
  await expect(marker.locator('.pokemon-sheet')).toHaveCSS('animation-play-state', 'running');
  await expect.poll(() => position(marker)).not.toEqual(start);
  await expect(marker.locator('[data-action="idle"]')).toHaveCount(1);
  await expect.poll(() => position(rivalViewOfHost)).toEqual(await position(marker));
  await expectStationary();
  const advanced = await position(marker);
  await host.keyboard.type(passage[3] === '#' ? '@' : '#');
  await expectStationary();
  expect(await position(marker)).toEqual(advanced);
  await host.bringToFront();
  for (const character of passage.slice(3, 6)) {
    await host.keyboard.type(character);
    await host.waitForTimeout(300);
  }
  await expect(marker.locator('[data-action="idle"]')).toHaveCount(1);
  const slowRate = Number(await marker.getAttribute('data-playback-rate'));
  await host.keyboard.type(passage.slice(6, 9), { delay: 50 });
  await expect.poll(async () => Number(await marker.getAttribute('data-playback-rate'))).toBeGreaterThan(slowRate);
  await expectStationary();
  expect(await assignments(host)).toEqual(before);
  expect(await assignments(rival)).toEqual(before);
  await host.context().close();
  await rival.context().close();
});

test('every sheet loads and renders a visible frame at native integer scale', async ({ page }) => {
  await page.goto('/credits');
  const sheets = page.locator('.pokemon-sheet');
  await expect(sheets).toHaveCount(20);
  await expect.poll(() => sheets.evaluateAll((images) => images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
  const rendered = await sheets.evaluateAll((images) => images.map((image) => ({ scale: image.getBoundingClientRect().width / (image as HTMLImageElement).naturalWidth, rendering: getComputedStyle(image).imageRendering })));
  expect(rendered.every(({ scale, rendering }) => Number.isInteger(scale) && scale >= 1 && rendering === 'pixelated')).toBe(true);
  await page.screenshot({ path: 'test-results/sprites-gallery.png', fullPage: true, animations: 'disabled' });
});


test('camp buddy stays still beside its trainer', async ({ page }) => {
  await enterAsGuest(page, uniqueName('Camp '));
  const sheet = page.locator('.camp-partner .pokemon-sheet');
  await expect(sheet).toHaveCSS('animation-play-state', 'paused');
  const frame = await frameTransform(sheet);
  await page.waitForTimeout(1000);
  expect(await frameTransform(sheet)).toBe(frame);
  await expect(page.locator('.camp-trainer canvas')).toBeVisible();
});
