import { expect, test } from '@playwright/test';
import fr from '../../messages/fr.json';
import { addMemberToRoom, openRoomAsNewGuest, readRoomCode } from './support/rooms';
import { withTestDatabase, uniqueName } from './support/guests';
import { expectNoAccessibilityViolations } from './support/axe';

for (const width of [375, 1440]) {
  test(`32-player lobby and profile preview at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1024 });
    const roomId = await openRoomAsNewGuest(page, uniqueName('Host '));
    await withTestDatabase(async (sql) => {
      for (let index = 1; index < 32; index++) {
        const [guest] = await sql`insert into guests (trainer_name) values (${`Trainer ${index}`}) returning id`;
        if (index === 31) await sql`insert into users (guest_id, username, trainer_avatar) values (${guest!.id}, ${uniqueName('Trainer_')}, 'may')`;
        await sql`insert into room_members (room_id, guest_id) values (${roomId}, ${guest!.id})`;
      }
      await sql`update rooms set revision = revision + 1 where id = ${roomId}`;
    });
    await expect(page.locator('.lobby-player')).toHaveCount(32);
    await expect(page.locator('.lobby-invite-code')).toHaveText(await readRoomCode(roomId));
    await expect(page.getByRole('button', { name: fr.Room.copyLink })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 375) expect(await page.locator('.lobby-roster').evaluate((roster) => roster.scrollHeight > roster.clientHeight)).toBe(true);
    await expect(page).toHaveTitle(fr.Metadata.roomTitle);
    await expectNoAccessibilityViolations(page);
    await expect(page.locator('.lobby-player canvas')).toHaveCount(0);
    await page.screenshot({ path: `test-results/lobby-32-${width}.png`, fullPage: true, animations: 'disabled' });
    const player = page.getByRole('button', { name: fr.Lobby.openProfile.replace('{name}', 'Trainer 31'), exact: true });
    await player.click();
    const dialog = page.getByRole('dialog', { name: 'Trainer 31' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('canvas')).toHaveAttribute('data-trainer-avatar', 'may');
    await expect(dialog.getByText(fr.Lobby.averageWpm, { exact: true })).toBeVisible();
    await expect(dialog.getByText(fr.Lobby.noBuddy)).toBeVisible();
    await expect(dialog.locator('dd')).toHaveText([fr.Lobby.noValue, fr.Lobby.noValue, fr.Lobby.noValue, '0', '0']);
    await expectNoAccessibilityViolations(page);
    await page.screenshot({ path: `test-results/lobby-profile-${width}.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(player).toBeFocused();
    await page.getByRole('button', { name: fr.Room.startRace }).click();
    await expect(page.locator('.route-player')).toHaveCount(1);
    await expect(page.getByRole('region', { name: fr.Room.leaderBoard }).locator('[data-leader]')).toHaveCount(3);
  });
}

test('the viewer card comes first with the banner and the gold frame, the others have none', async ({ page }) => {
  const viewer = uniqueName('Me ');
  const roomId = await openRoomAsNewGuest(page, viewer);
  await withTestDatabase(async (sql) => {
    const [older] = await sql`select id from guests where trainer_name = ${viewer}`;
    await sql`update room_members set joined_at = now() + interval '1 hour' where guest_id = ${older!.id}`;
  });
  for (const name of [uniqueName('Zoe '), uniqueName('Leo ')]) await addMemberToRoom(roomId, name);
  await page.reload();

  const cards = page.locator('.lobby-player');
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toHaveAttribute('data-viewer', 'true');
  await expect(cards.first()).toContainText(viewer);
  await expect(cards.first().locator('.lobby-player-ribbon')).toHaveText(fr.Room.youMarker);
  await expect(cards.first().locator('.lobby-player-ribbon')).toHaveCSS('text-transform', 'uppercase');
  await expect(page.locator('.lobby-player-ribbon')).toHaveCount(1);
  await expect(page.locator('.lobby-player[data-viewer]')).toHaveCount(1);
  await expect(cards.first()).toHaveCSS('box-shadow', /rgb\(242, 206, 88\) 0px 0px 0px 5px inset/);
  await expect(cards.nth(1)).not.toHaveCSS('box-shadow', /rgb\(242, 206, 88\)/);
  await expect(page.locator('.lobby-player canvas')).toHaveCount(0);
  const heights = await cards.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  expect(new Set(heights).size).toBe(1);

  await cards.first().click();
  await expect(page.getByRole('dialog').locator('canvas[data-trainer-avatar]')).toHaveCount(1);
});
