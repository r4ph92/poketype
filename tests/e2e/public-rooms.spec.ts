import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { gameConfig } from '../../src/config/game';
import { startAppServer, type AppServer } from './support/app-server';
import { expectNoAccessibilityViolations } from './support/axe';
import { expectEveryVisibleStringFromCatalog } from './support/catalog';
import { enterAsGuest, uniqueName, withDatabase } from './support/guests';
import { createIsolatedDatabase, type IsolatedDatabase } from './support/isolated-database';
import { createRoom, playerCountText } from './support/rooms';

const isolatedServerPort = Number(process.env.E2E_PORT ?? 3100) + 4;
const isolatedServerUrl = `http://localhost:${isolatedServerPort}`;
const productionBuildExists = existsSync(path.join(process.cwd(), '.next', 'BUILD_ID'));
const capacity = gameConfig.rooms.capacity;
const appearsWithinMs = 2_000;

const roomOf = (name: string) => fr.PublicRooms.roomOf.replace('{name}', name);
const playersOf = (count: number) => fr.PublicRooms.players.replace('{count}', String(count)).replace('{capacity}', String(capacity));
const publicRoomRows = (page: Page) => page.getByRole('list', { name: fr.PublicRooms.listLabel }).getByRole('listitem');
const roomRow = (page: Page, hostName: string) => publicRoomRows(page).filter({ hasText: roomOf(hostName) });

async function newPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ baseURL: isolatedServerUrl });
  return context.newPage();
}

async function newGuest(browser: Browser, trainerName: string): Promise<Page> {
  const page = await newPage(browser);
  await enterAsGuest(page, trainerName);
  return page;
}

async function openPublicRooms(browser: Browser, trainerName: string): Promise<Page> {
  const page = await newGuest(browser, trainerName);
  await page.goto('/play/race');
  return page;
}

function roomIdIn(page: Page): string {
  return new URL(page.url()).pathname.split('/').pop()!;
}

async function expectInRoom(page: Page, roomId: string): Promise<void> {
  await expect(page).toHaveURL(`/rooms/${roomId}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.Room.heading);
}

test.describe('public rooms and "Faire une course", on a server whose database no other spec writes to', () => {
  test.describe.configure({ mode: 'default' });
  test.skip(!productionBuildExists, 'starts a second production server from the existing build');

  let isolated: IsolatedDatabase;
  let appServer: AppServer | undefined;

  const seedRoom = (players: number, minutesAgo: number) =>
    withDatabase(isolated.url, async (sql) => {
      const [host] = await sql`insert into guests (trainer_name) values (${uniqueName('Hôte ')}) returning id, trainer_name`;
      const [room] = await sql`insert into rooms (host_guest_id, created_at) values (${host!.id}, now() - make_interval(mins => ${minutesAgo})) returning id`;
      await sql`
        with players as (insert into guests (trainer_name) select 'Joueur ' || seat from generate_series(1, ${players - 1}) seat returning id)
        insert into room_members (room_id, guest_id) select ${room!.id}::uuid, ${host!.id}::uuid union all select ${room!.id}::uuid, id from players`;
      return { roomId: room!.id as string, hostName: host!.trainer_name as string };
    });

  const setPhase = (roomId: string, phase: 'closed' | 'countdown') =>
    withDatabase(isolated.url, (sql) => sql`update rooms set phase = ${phase}, revision = revision + 1 where id = ${roomId}`);

  const countMembers = (roomId: string) =>
    withDatabase(isolated.url, async (sql) => (await sql`select count(*)::int as total from room_members where room_id = ${roomId}`)[0]!.total as number);

  const countRoomsJoinedBy = (trainerName: string) =>
    withDatabase(isolated.url, async (sql) => {
      const [row] = await sql`select count(*)::int as total from room_members m join guests g on g.id = m.guest_id where g.trainer_name = ${trainerName}`;
      return row!.total as number;
    });

  test.beforeAll(async () => {
    isolated = await createIsolatedDatabase();
    appServer = await startAppServer(isolatedServerPort, isolated.url);
  });

  test.afterAll(async () => {
    await appServer?.stop();
    await isolated?.drop();
  });

  test.beforeEach(() => withDatabase(isolated.url, (sql) => sql`update rooms set phase = 'closed' where phase <> 'closed'`));

  test('with no public room, Zoe sees the French empty state and a "Créer une salle" button', async ({ browser }) => {
    const zoe = await openPublicRooms(browser, uniqueName('Zoe '));

    await expect(zoe.getByText(fr.PublicRooms.empty, { exact: true })).toBeVisible();
    await expect(zoe.getByRole('button', { name: fr.Play.createRoom })).toBeVisible();
    await expectEveryVisibleStringFromCatalog(zoe);
    await expectNoAccessibilityViolations(zoe);
  });

  test('Alex creates a room: within 2 s Zoe sees it with his name, the player count and "En attente", and joins it with one click', async ({ browser }) => {
    const alexName = uniqueName('Alex ');
    const zoe = await openPublicRooms(browser, uniqueName('Zoe '));
    const alex = await newGuest(browser, alexName);

    const roomId = await createRoom(alex);
    const row = roomRow(zoe, alexName);
    await expect(row).toBeVisible({ timeout: appearsWithinMs });
    await expect(row).toContainText(playersOf(1));
    await expect(row).toContainText(fr.PublicRooms.waiting);

    await row.getByRole('link', { name: fr.PublicRooms.joinLabel.replace('{name}', alexName) }).click();
    await expectInRoom(zoe, roomId);
    await expect(alex.getByText(playerCountText(2)).first()).toBeVisible();
  });

  test('a room disappears from the list within 2 s once its race starts or it closes', async ({ browser }) => {
    const racing = await seedRoom(2, 2);
    const closing = await seedRoom(1, 1);
    const zoe = await openPublicRooms(browser, uniqueName('Zoe '));
    await expect(roomRow(zoe, racing.hostName)).toBeVisible();
    await expect(roomRow(zoe, closing.hostName)).toBeVisible();

    await setPhase(racing.roomId, 'countdown');
    await expect(roomRow(zoe, racing.hostName)).toHaveCount(0, { timeout: appearsWithinMs });

    await setPhase(closing.roomId, 'closed');
    await expect(roomRow(zoe, closing.hostName)).toHaveCount(0, { timeout: appearsWithinMs });
    await expect(zoe.getByText(fr.PublicRooms.empty, { exact: true })).toBeVisible();
  });

  for (const width of [375, 1440]) {
    test(`30 waiting rooms are listed fullest first and the list scrolls at ${width}px, without seating the viewer anywhere`, async ({ browser }) => {
      const counts = Array.from({ length: 30 }, (_, index) => ((index * 7) % 30) + 1);
      for (const [index, players] of counts.entries()) await seedRoom(players, index + 1);
      const zoeName = uniqueName('Zoe ');
      const zoe = await openPublicRooms(browser, zoeName);
      await zoe.setViewportSize({ width, height: 900 });

      const rows = publicRoomRows(zoe);
      await expect(rows).toHaveCount(30);
      const shownCounts = (await rows.getByText(/^\d+ \/ \d+ joueurs$/).allTextContents()).map((text) => Number.parseInt(text, 10));
      expect(shownCounts).toEqual([...counts].sort((first, second) => second - first));
      const list = zoe.getByRole('list', { name: fr.PublicRooms.listLabel });
      expect(await list.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
      await rows.last().getByRole('link').scrollIntoViewIfNeeded();
      await expect(rows.last().getByRole('link')).toBeInViewport();
      expect(await zoe.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expectEveryVisibleStringFromCatalog(zoe);
      await expectNoAccessibilityViolations(zoe);
      await zoe.screenshot({ path: `test-results/public-rooms-${width}.png`, fullPage: true, animations: 'disabled' });
      await zoe.waitForTimeout(1_500);
      expect(await countRoomsJoinedBy(zoeName)).toBe(0);
    });
  }

  test('Nina without a session who opens the list is asked for a trainer name first', async ({ browser }) => {
    const nina = await newPage(browser);
    await nina.goto('/play/race');

    await expect(nina).toHaveURL('/');
    await expect(nina.getByLabel(fr.GuestEntry.label)).toBeVisible();
  });

  test('"Faire une course" on the trainer hub puts Zoe in the fullest waiting room', async ({ browser }) => {
    await seedRoom(1, 3);
    const fullest = await seedRoom(3, 2);
    await seedRoom(2, 1);
    const zoe = await newGuest(browser, uniqueName('Zoe '));

    await zoe.getByRole('button', { name: fr.Play.findRace }).click();

    await expectInRoom(zoe, fullest.roomId);
    expect(await countMembers(fullest.roomId)).toBe(4);
    await expect(zoe.getByText(playerCountText(4)).first()).toBeVisible();
  });

  test('from the home page without a session, Nina enters a name, clicks "Faire une course" and hosts a new room when none is eligible', async ({ browser }) => {
    const full = await seedRoom(capacity, 1);
    const ninaName = uniqueName('Nina ');
    const nina = await newPage(browser);
    await nina.goto('/');

    await nina.getByLabel(fr.GuestEntry.label).fill(ninaName);
    await nina.getByRole('button', { name: fr.Play.findRace }).click();

    await expect(nina).toHaveURL(/\/rooms\/[0-9a-f-]{36}$/);
    expect(roomIdIn(nina)).not.toBe(full.roomId);
    await expect(nina.getByRole('heading', { level: 1 })).toHaveText(fr.Room.heading);
    await expect(nina.getByRole('button', { name: fr.Room.startRace })).toBeVisible();
    await expectEveryVisibleStringFromCatalog(nina, [ninaName, roomIdIn(nina)]);
  });

  test('a 33rd player opening the link of a full room is refused in French, and the full room is not listed', async ({ browser }) => {
    const full = await seedRoom(capacity, 1);
    const zoe = await openPublicRooms(browser, uniqueName('Zoe '));
    await expect(roomRow(zoe, full.hostName)).toHaveCount(0);

    await zoe.goto(`/rooms/${full.roomId}`);

    await expect(zoe.getByRole('heading', { level: 1 })).toHaveText(fr.Room.fullHeading);
    await expect(zoe).toHaveTitle(fr.Metadata.roomFullTitle);
    await expect(zoe.getByRole('link', { name: fr.Room.toPublicRooms })).toBeVisible();
    await expectEveryVisibleStringFromCatalog(zoe);
    expect(await countMembers(full.roomId)).toBe(capacity);
  });
});

