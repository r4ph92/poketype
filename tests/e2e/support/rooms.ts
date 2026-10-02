import { randomInt } from 'node:crypto';
import { expect, type APIResponse, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';
import type { TransactionSql } from 'postgres';
import fr from '../../../messages/fr.json';
import { gameConfig } from '../../../src/config/game';
import { frenchPassages } from '../../../src/config/passages';
import { generateRoomCode } from '../../../src/domain/room-code';
import { holdsRace, type RoomPhase } from '../../../src/domain/room-phase';
import { enterAsGuest, withTestDatabase } from './guests';
import { headersWithout, type CapturedSubmission } from './submissions';

const roomAddress = /\/rooms\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// The lobby also holds the idle toast's live region, so the copy confirmation is read inside the invitation panel.
export const invitationStatus = (page: Page) => page.getByRole('region', { name: fr.Lobby.inviteTitle }).getByRole('status');

export const playerRows = (page: Page) => page.getByRole('list').getByRole('listitem');

export function roomPagePath(roomId: string): string {
  return `/rooms/${roomId}`;
}

export function playerCountText(count: number): string {
  return count === 1 ? '1 joueur' : `${count} joueurs`;
}

export const createRoomDialog = (page: Page) => page.getByRole('dialog', { name: fr.RoomAccess.createTitle });

const visibilityName = { public: fr.RoomAccess.public, unlisted: fr.RoomAccess.unlisted } as const;

// With JavaScript the button asks for the visibility first; without it, the button opens a public room at once.
export async function createRoom(page: Page, visibility: keyof typeof visibilityName = 'public'): Promise<string> {
  await page.getByRole('button', { name: fr.Play.createRoom }).click();
  const dialog = createRoomDialog(page);
  await expect(dialog.or(page.getByRole('heading', { level: 1, name: fr.Room.heading }))).toBeVisible();
  if (await dialog.isVisible()) await confirmCreateRoom(page, visibility);
  await expect(page).toHaveURL(roomAddress);
  return new URL(page.url()).pathname.split('/').pop()!;
}

export async function chooseVisibility(scope: Page | Locator, name: string): Promise<void> {
  await scope.getByRole('radio', { name }).check();
}

export async function confirmCreateRoom(page: Page, visibility: keyof typeof visibilityName = 'public'): Promise<void> {
  const dialog = createRoomDialog(page);
  await chooseVisibility(dialog, visibilityName[visibility]);
  await dialog.getByRole('button', { name: fr.RoomAccess.confirmCreate }).click();
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
  await confirmCreateRoom(page);
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

// Adds guests named "<prefix>1", "<prefix>2"… until the room holds `total` members, in one statement.
export async function fillRoomTo(roomId: string, total: number, prefix = 'Seat '): Promise<void> {
  await withTestDatabase(async (sql) => {
    await sql`
      with missing as (select ${total} - count(*)::int as total from room_members where room_id = ${roomId}),
      new_guests as (insert into guests (trainer_name) select ${prefix} || seat from missing, generate_series(1, missing.total) seat returning id)
      insert into room_members (room_id, guest_id) select ${roomId}, id from new_guests`;
    await sql`update rooms set revision = revision + 1 where id = ${roomId}`;
  });
}

export async function readRoomRevision(roomId: string): Promise<number> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`select revision from rooms where id = ${roomId}`;
    return row!.revision as number;
  });
}

export const testPassage = frenchPassages[0]!;

type RaceToInsert = { startsInMs: number; passage: string; timeLimitMs: number };

export type RaceOptions = { passage?: string; timeLimitMs?: number };

const defaultTimeLimitMs = gameConfig.race.timeLimitSeconds * 1000;

// A race phase always has its race row and one participant per member, each with their partner, as the start command writes them in one transaction.
export async function setRoomPhase(roomId: string, phase: RoomPhase, startsInMs = 0): Promise<void> {
  await enterPhase(roomId, phase, { startsInMs, passage: testPassage, timeLimitMs: defaultTimeLimitMs });
}

// The running server reads its time limit from the built config, so a test shortens a race only through its stored deadline.
export async function startRaceInDatabase(roomId: string, startsInMs: number, { passage = testPassage, timeLimitMs = defaultTimeLimitMs }: RaceOptions = {}): Promise<void> {
  await enterPhase(roomId, 'countdown', { startsInMs, passage, timeLimitMs });
}

async function enterPhase(roomId: string, phase: RoomPhase, race: RaceToInsert): Promise<void> {
  await withTestDatabase((sql) =>
    sql.begin(async (transaction) => {
      if (holdsRace(phase)) await insertRaceOfMembers(transaction, roomId, race);
      await transaction`update rooms set phase = ${phase}, revision = revision + 1 where id = ${roomId}`;
    }),
  );
}

// Millisecond precision, like a start time written from a JavaScript date, so finish times read back exactly.
async function insertRaceOfMembers(transaction: TransactionSql, roomId: string, { startsInMs, passage, timeLimitMs }: RaceToInsert): Promise<void> {
  const startsAt = transaction`date_trunc('milliseconds', now() + ${startsInMs} * interval '1 millisecond')`;
  const deadlineAt = transaction`date_trunc('milliseconds', now() + ${startsInMs + timeLimitMs} * interval '1 millisecond')`;
  const [race] = await transaction`insert into races (room_id, passage, starts_at, deadline_at) values (${roomId}, ${passage}, ${startsAt}, ${deadlineAt}) returning id`;
  await transaction`
    insert into race_participants (race_id, guest_id, partner_dex)
    select ${race!.id}, room_members.guest_id, owned_pokemon.dex
    from room_members left join owned_pokemon on owned_pokemon.guest_id = room_members.guest_id and owned_pokemon.is_partner
    where room_members.room_id = ${roomId}`;
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

export type StoredRace = { id: string; passage: string; startsAt: Date; deadlineAt: Date };

export async function readRoomRaces(roomId: string): Promise<StoredRace[]> {
  return withTestDatabase(async (sql) => {
    const rows = await sql`select id, passage, starts_at, deadline_at from races where room_id = ${roomId} order by created_at`;
    return rows.map((row) => ({ id: row.id as string, passage: row.passage as string, startsAt: row.starts_at as Date, deadlineAt: row.deadline_at as Date }));
  });
}

export function startPath(roomId: string): string {
  return `/api/rooms/${roomId}/start`;
}

export function progressPath(roomId: string): string {
  return `/api/rooms/${roomId}/progress`;
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

export type StoredCounters = Pick<StoredParticipant, 'position' | 'keystrokes' | 'rejectedKeystrokes'>;

export async function readCountersOf(roomId: string, trainerName: string): Promise<StoredCounters> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`
      select p.position, p.keystrokes, p.rejected_keystrokes
      from race_participants p join guests g on g.id = p.guest_id
      where g.trainer_name = ${trainerName}
        and p.race_id = (select id from races where room_id = ${roomId} order by created_at desc limit 1)`;
    return { position: row!.position as number, keystrokes: row!.keystrokes as number, rejectedKeystrokes: row!.rejected_keystrokes as number };
  });
}

export type StoredIdleState = { phase: RoomPhase; lastActivityAt: Date; closeReason: string | null };

export async function readIdleState(roomId: string): Promise<StoredIdleState> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`select phase, last_activity_at, close_reason from rooms where id = ${roomId}`;
    return { phase: row!.phase as RoomPhase, lastActivityAt: row!.last_activity_at as Date, closeReason: row!.close_reason as string | null };
  });
}

// The running server reads its idle durations from the built config, so a test ages a lobby only through its stored last activity.
export async function setLobbyInactiveFor(roomId: string, inactiveMs: number): Promise<void> {
  await withTestDatabase((sql) => sql`update rooms set last_activity_at = now() - ${inactiveMs} * interval '1 millisecond', revision = revision + 1 where id = ${roomId}`);
}

// Random like the server's codes, so seeded rooms never collide with each other or with created ones in practice.
export function uniqueRoomCode(): string {
  return generateRoomCode(randomInt);
}

export type StoredRoomAccess = { code: string; visibility: 'public' | 'unlisted' };

export async function readRoomAccess(roomId: string): Promise<StoredRoomAccess> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`select code, visibility from rooms where id = ${roomId}`;
    return { code: row!.code as string, visibility: row!.visibility as StoredRoomAccess['visibility'] };
  });
}

export async function readRoomCode(roomId: string): Promise<string> {
  return (await readRoomAccess(roomId)).code;
}

// Failures one second apart, the newest secondsAgo before now on the database clock.
export async function insertRoomCodeFailures(guestId: string, count: number, secondsAgo = 0): Promise<void> {
  await withTestDatabase(async (sql) => {
    for (let index = 0; index < count; index += 1) {
      await sql`insert into room_code_failures (guest_id, failed_at) values (${guestId}, now() - make_interval(secs => ${secondsAgo + index}))`;
    }
  });
}

export async function countRoomCodeFailures(guestId: string): Promise<number> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`select count(*)::int as total from room_code_failures where guest_id = ${guestId}`;
    return row!.total as number;
  });
}
