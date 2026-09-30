import { expect, type APIResponse, type Page } from '@playwright/test';
import fr from '../../../messages/fr.json';
import type { RoomPhase } from '../../../src/domain/room-phase';
import { withTestDatabase } from './guests';
import { headersWithout, type CapturedSubmission } from './submissions';

const roomAddress = /\/rooms\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function playerCountText(count: number): string {
  return count === 1 ? '1 joueur' : `${count} joueurs`;
}

export async function createRoom(page: Page): Promise<string> {
  await page.getByRole('button', { name: fr.Play.createRoom }).click();
  await expect(page).toHaveURL(roomAddress);
  return new URL(page.url()).pathname.split('/').pop()!;
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

export async function setRoomPhase(roomId: string, phase: RoomPhase): Promise<void> {
  await withTestDatabase(async (sql) => {
    await sql`update rooms set phase = ${phase} where id = ${roomId}`;
  });
}
