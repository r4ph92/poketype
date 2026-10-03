import { expect, test } from '@playwright/test';
import fr from '../../messages/fr.json';
import { enterAsGuest, uniqueName } from './support/guests';
import { expectNoAccessibilityViolations } from './support/axe';
import { createRoom, newGuestPage } from './support/rooms';
import { timer, typingArea } from './support/race';
import { findGuestIdNamed, givePokemon } from './support/trainer';

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

test('racers stay still unless correct typing advances them, on the map, with the rival leader bar following the same progress', async ({ browser }) => {
  const host = await newGuestPage(browser, 'Alex sprites');
  const roomId = await createRoom(host);
  const rival = await newGuestPage(browser, 'Zoe sprites');
  await rival.goto(`/rooms/${roomId}`);
  await expect(host.locator('[data-racer]')).toHaveCount(2);
  const assignments = async (page: typeof host) => page.locator('[data-racer]').evaluateAll((racers) => racers.map((racer) => ({ key: racer.getAttribute('data-racer'), species: racer.querySelector('[data-species]')?.getAttribute('data-species') })).sort((first, second) => String(first.key).localeCompare(String(second.key))));
  expect(await assignments(host)).toEqual(await assignments(rival));
  const before = await assignments(host);
  await host.getByRole('button', { name: fr.Room.startRace }).click();
  await expect(timer(host)).toHaveText(fr.Room.go, { timeout: 8000 });
  await expect(typingArea(host)).toBeFocused();
  const marker = host.locator('[data-racer][data-viewer="true"]');
  const hostKey = (await marker.getAttribute('data-racer'))!;
  const hostLeader = host.locator(`[data-leader="${hostKey}"]`);
  const rivalViewOfHost = rival.locator(`[data-leader="${hostKey}"]`);
  await expect(rival.locator(`[data-racer="${hostKey}"]`)).toHaveCount(0);
  const position = (racer: typeof marker) => racer.evaluate((element) => ({ left: (element as HTMLElement).style.left, top: (element as HTMLElement).style.top }));
  const share = (leader: typeof marker) => leader.getAttribute('data-share');
  const expectStationary = async () => {
    await expect(marker.locator('.pokemon-sheet')).toHaveCSS('animation-play-state', 'paused');
    const localPosition = await position(marker);
    const remoteShare = await share(rivalViewOfHost);
    const localFrame = await frameTransform(marker.locator('.pokemon-sheet'));
    // Longer than animation cycles and several polling intervals: no background advance or idle motion.
    await host.waitForTimeout(1000);
    expect(await position(marker)).toEqual(localPosition);
    expect(await share(rivalViewOfHost)).toBe(remoteShare);
    expect(await frameTransform(marker.locator('.pokemon-sheet'))).toBe(localFrame);
  };
  await expectStationary();
  const start = await position(marker);
  const passage = (await host.locator('#passage-text').textContent())!;
  const wrong = passage[0] === '#' ? '@' : '#';
  await host.keyboard.type(wrong.repeat(3), { delay: 50 });
  await host.keyboard.press('Backspace');
  await expectStationary();
  expect(await position(marker)).toEqual(start);
  expect(await share(rivalViewOfHost)).toBe('0');
  await host.keyboard.type(passage.slice(0, 3), { delay: 50 });
  await expect(marker.locator('[data-action="walk"]')).toHaveCount(1);
  await expect(marker.locator('.pokemon-sheet')).toHaveCSS('animation-play-state', 'running');
  await expect.poll(() => position(marker)).not.toEqual(start);
  await expect(marker.locator('[data-action="idle"]')).toHaveCount(1);
  await expect.poll(() => share(rivalViewOfHost)).toBe(await share(hostLeader));
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
  await expect(marker.locator('[data-action="idle"]')).toHaveCount(1);
  await expect.poll(() => share(rivalViewOfHost)).toBe(await share(hostLeader));
  await expectStationary();
  const hostSpecies = before.find(({ key }) => key === hostKey)!.species;
  await expect(marker.locator('[data-species]')).toHaveAttribute('data-species', hostSpecies!);
  await host.context().close();
  await rival.context().close();
});

test('every sheet loads and renders a visible frame at native integer scale', async ({ page }) => {
  await page.goto('/credits');
  const sheets = page.locator('.pokemon-sheet');
  await expect(sheets).toHaveCount(30);
  await expect.poll(() => sheets.evaluateAll((images) => images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
  const rendered = await sheets.evaluateAll((images) => images.map((image) => ({ scale: image.getBoundingClientRect().width / (image as HTMLImageElement).naturalWidth, rendering: getComputedStyle(image).imageRendering })));
  expect(rendered.every(({ scale, rendering }) => Number.isInteger(scale) && scale >= 1 && rendering === 'pixelated')).toBe(true);
  await page.screenshot({ path: 'test-results/sprites-gallery.png', fullPage: true, animations: 'disabled' });
});

test('a species without animated sheets shows its still front artwork, and the credits say so', async ({ page }) => {
  const name = uniqueName('Still ');
  await enterAsGuest(page, name);
  await givePokemon(await findGuestIdNamed(name), 618, 5);
  await page.goto('/play/pokedex');
  await page.getByRole('group', { name: fr.Pokedex.regions }).getByRole('button', { name: new RegExp(`^${fr.Regions.unova}`) }).click();
  await page.getByRole('textbox', { name: fr.Pokedex.search }).fill(fr.Pokemon.stunfisk);
  await page.locator('.pokedex-card').click();
  const still = page.locator('.pokedex-detail .pokemon-still[data-species="stunfisk"] img');
  await expect(still).toHaveAttribute('src', '/assets/sprites/pokemon/front/618.png');
  await expect.poll(() => still.evaluate((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
  await page.goto('/credits');
  await page.getByText(fr.Credits.fullCatalog.replace('{count}', '649')).click();
  await expect(page.getByRole('region', { name: fr.Regions.unova }).getByText(fr.Credits.stillArtwork)).toHaveCount(14);
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
