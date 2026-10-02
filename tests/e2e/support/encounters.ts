import { randomInt } from 'node:crypto';
import { roomCodeAlphabet, roomCodeLength } from '../../../src/domain/room-code';
import { withTestDatabase } from './guests';

export type EncounterSetup = { dex?: number; level?: number; throwsUsed?: number };

export type StoredEncounter = { id: string; dex: number; level: number; throwsUsed: number; status: string };

function randomRoomCode(): string {
  return Array.from({ length: roomCodeLength }, () => roomCodeAlphabet[randomInt(roomCodeAlphabet.length)]).join('');
}

// A settled race the guest took part in, in a closed room of their own, so an encounter row can name it.
export async function insertPastRaceFor(guestId: string): Promise<string> {
  return withTestDatabase(async (sql) => {
    const [room] = await sql`insert into rooms (host_guest_id, code, phase) values (${guestId}, ${randomRoomCode()}, 'closed') returning id`;
    const [race] = await sql`
      insert into races (room_id, passage, starts_at, deadline_at, ended_at, rules_version)
      values (${room!.id}, 'Le chat dort.', now() - interval '1 minute', now() + interval '2 minutes', now(), 1)
      returning id`;
    await sql`insert into race_participants (race_id, guest_id) values (${race!.id}, ${guestId})`;
    return race!.id as string;
  });
}

// Returns the new encounter's id; each one gets its own past race, as a real race grants at most one.
export async function insertWaitingEncounter(guestId: string, { dex = 19, level = 3, throwsUsed = 0 }: EncounterSetup = {}): Promise<string> {
  const raceId = await insertPastRaceFor(guestId);
  const [row] = await withTestDatabase((sql) => sql`
    insert into wild_encounters (guest_id, race_id, dex, level, throws_used) values (${guestId}, ${raceId}, ${dex}, ${level}, ${throwsUsed}) returning id`);
  return row!.id as string;
}

export async function readEncountersOf(guestId: string): Promise<StoredEncounter[]> {
  return withTestDatabase(async (sql) => {
    const rows = await sql`select id, dex, level, throws_used, status from wild_encounters where guest_id = ${guestId} order by created_at, id`;
    return rows.map((row) => ({ id: row.id as string, dex: row.dex as number, level: row.level as number, throwsUsed: row.throws_used as number, status: row.status as string }));
  });
}

export async function giveBalls(guestId: string, quantity: number): Promise<void> {
  await withTestDatabase((sql) => sql`
    insert into bag_items (guest_id, item, quantity) values (${guestId}, 'poke-ball', ${quantity})
    on conflict (guest_id, item) do update set quantity = ${quantity}`);
}

export async function ballsOf(guestId: string): Promise<number> {
  const [row] = await withTestDatabase((sql) => sql`select quantity from bag_items where guest_id = ${guestId} and item = 'poke-ball'`);
  return (row?.quantity as number | undefined) ?? 0;
}

// Tops the collection up to count Pokémon with level 1 Rattata, beside the ones it already holds.
export async function fillCollectionTo(guestId: string, count: number): Promise<void> {
  await withTestDatabase(async (sql) => {
    const [owned] = await sql`select count(*)::int as total from owned_pokemon where guest_id = ${guestId}`;
    const missing = count - (owned!.total as number);
    if (missing > 0) await sql`insert into owned_pokemon (guest_id, dex, level) select ${guestId}, 19, 1 from generate_series(1, ${missing})`;
  });
}

export async function pcBoxesOf(guestId: string): Promise<number> {
  const [row] = await withTestDatabase((sql) => sql`select pc_boxes from guests where id = ${guestId}`);
  return row!.pc_boxes as number;
}

export type StoredLegendary = { dex: number; isClaimed: boolean };

export async function readLegendariesOf(guestId: string): Promise<StoredLegendary[]> {
  return withTestDatabase(async (sql) => {
    const rows = await sql`select dex, claimed_at from legendary_grants where guest_id = ${guestId} order by dex`;
    return rows.map((row) => ({ dex: row.dex as number, isClaimed: row.claimed_at !== null }));
  });
}

export async function countOwnedOfSpecies(guestId: string, dex: number): Promise<number> {
  const [row] = await withTestDatabase((sql) => sql`select count(*)::int as total from owned_pokemon where guest_id = ${guestId} and dex = ${dex}`);
  return row!.total as number;
}
