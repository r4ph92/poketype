import { expect, type APIResponse, type Browser, type BrowserContext, type Page } from '@playwright/test';
import fr from '../../../messages/fr.json';
import { frenchPassages } from '../../../src/config/passages';
import { holdsRace, type RoomPhase } from '../../../src/domain/room-phase';
import { enterAsGuest, withTestDatabase } from './guests';
import { headersWithout, type CapturedSubmission } from './submissions';

const roomAddress = /\/rooms\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const playerRows = (page: Page) => page.getByRole('list').getByRole('listitem');

export function roomPagePath(roomId: string): string {
  return `/rooms/${roomId}`;
}

export function playerCountText(count: number): string {
  return count === 1 ? '1 joueur' : `${count} joueurs`;
}

export async function createRoom(page: Page): Promise<string> {
  await page.getByRole('button', { name: fr.Play.createRoom }).click();
  await expect(page).toHaveURL(roomAddress);
  return new URL(page.url()).pathname.split('/').pop()!;
}

export async function openRoomAsNewGuest(page: Page, trainerName: string): Promise<string> {
  await enterAsGuest(page, trainerName);
  return createRoom(page);
}

export async function newGuestPage(browser: Browser, trainerName: string, prepare?: (context: BrowserContext) => Promise<void>): Promise<Page> {
  const context = await browser.newContext();
  await prepare?.(context);
  const page = await context.newPage();
  await enterAsGuest(page, trainerName);
  return page;
}

export async function captureCreateRoomSubmission(page: Page): Promise<CapturedSubmission> {
  const captured = new Promise<CapturedSubmission>((resolve) => {
    void page.route('**/play', async (route) => {
      const request = route.request();
      if (request.method() !== 'POST') return route.continue();
      resolve({ headers: headersWithout(request.headers(), ['content-length', 'cookie']), body: request.postDataBuffer()! });
      return route.abort();
    });
  });
  await page.getByRole('button', { name: fr.Play.createRoom }).click();
  return captured;
}

export function redirectTarget(response: APIResponse): string | null {
  const target = response.headers()['x-action-redirect'] ?? response.headers()['location'];
  return target?.split(';')[0] ?? null;
}

export async function countRoomsHostedBy(trainerName: string): Promise<number> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`
      select count(*)::int as total from rooms
      join guests on guests.id = rooms.host_guest_id
      where guests.trainer_name = ${trainerName}`;
    return row!.total as number;
  });
}

export async function countMembersOf(roomId: string): Promise<number> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`select count(*)::int as total from room_members where room_id = ${roomId}`;
    return row!.total as number;
  });
}

export async function addMemberToRoom(roomId: string, trainerName: string): Promise<void> {
  await withTestDatabase(async (sql) => {
    const [guest] = await sql`insert into guests (trainer_name) values (${trainerName}) returning id`;
    await sql`insert into room_members (room_id, guest_id) values (${roomId}, ${guest!.id})`;
  });
}

export async function readRoomRevision(roomId: string): Promise<number> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`select revision from rooms where id = ${roomId}`;
    return row!.revision as number;
  });
}

export const testPassage = frenchPassages[0]!;

// A race phase always has its race row and one participant per member, as the start command writes them in one transaction.
export async function setRoomPhase(roomId: string, phase: RoomPhase, startsInMs = 0): Promise<void> {
  await withTestDatabase((sql) =>
    sql.begin(async (transaction) => {
      if (holdsRace(phase)) {
        const [race] = await transaction`insert into races (room_id, passage, starts_at) values (${roomId}, ${testPassage}, now() + ${startsInMs} * interval '1 millisecond') returning id`;
        await transaction`insert into race_participants (race_id, guest_id) select ${race!.id}, guest_id from room_members where room_id = ${roomId}`;
      }
      await transaction`update rooms set phase = ${phase}, revision = revision + 1 where id = ${roomId}`;
    }),
  );
}

export async function startRaceInDatabase(roomId: string, startsInMs: number): Promise<void> {
  await setRoomPhase(roomId, 'countdown', startsInMs);
}

export function snapshotPath(roomId: string): string {
  return `/api/rooms/${roomId}/snapshot`;
}

export async function readRoomPhase(roomId: string): Promise<RoomPhase> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`select phase from rooms where id = ${roomId}`;
    return row!.phase as RoomPhase;
  });
}

export type StoredRace = { passage: string; startsAt: Date };

export async function readRoomRaces(roomId: string): Promise<StoredRace[]> {
  return withTestDatabase(async (sql) => {
    const rows = await sql`select passage, starts_at from races where room_id = ${roomId} order by created_at`;
    return rows.map((row) => ({ passage: row.passage as string, startsAt: row.starts_at as Date }));
  });
}

export function startPath(roomId: string): string {
  return `/api/rooms/${roomId}/start`;
}

export type StoredParticipant = {
  guestId: string;
  position: number;
  keystrokes: number;
  rejectedKeystrokes: number;
  lastSequence: number;
  lastReportedAt: Date | null;
  finishedAt: Date | null;
};

export async function readParticipants(roomId: string): Promise<StoredParticipant[]> {
  return withTestDatabase(async (sql) => {
    const rows = await sql`
      select guest_id, position, keystrokes, rejected_keystrokes, last_sequence, last_reported_at, finished_at
      from race_participants
      where race_id = (select id from races where room_id = ${roomId} order by created_at desc limit 1)
      order by guest_id`;
    return rows.map((row) => ({
      guestId: row.guest_id as string,
      position: row.position as number,
      keystrokes: row.keystrokes as number,
      rejectedKeystrokes: row.rejected_keystrokes as number,
      lastSequence: row.last_sequence as number,
      lastReportedAt: row.last_reported_at as Date | null,
      finishedAt: row.finished_at as Date | null,
    }));
  });
}
