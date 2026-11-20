import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { botCharacters } from '../../src/assets/bot-characters';
import type { GuestId } from '../../src/domain/guest-id';
import { passageLength } from '../../src/domain/passage';
import type { RoomId } from '../../src/domain/room-id';
import { gameConfig } from '../../src/config/game';
import { loadRoomSnapshot } from '../../src/server/rooms/load-room-snapshot';
import { settleDueRace } from '../../src/server/rooms/race-deadline';
import { reportProgress } from '../../src/server/rooms/report-progress';
import { openRoom, joinRoom } from '../../src/server/rooms/room-commands';
import { openTestDatabase } from './support/test-database';

const { database, sql } = openTestDatabase();
const idleMs = gameConfig.race.idleEndAfterSeconds * 1000;
const passage = 'Le garçon range ses crayons dans sa trousse avant la récréation.';

afterAll(async () => {
  await sql.end();
});

type Racer = { guestId: GuestId };

type Race = { roomId: RoomId; raceId: string; startsAt: Date; alex: Racer; zoe: Racer; nina: Racer };

type RaceOptions = { timeLimitSeconds?: number | null; bots?: number };

async function insertRacer(name: string): Promise<GuestId> {
  const [guest] = await sql`insert into guests (trainer_name) values (${`${name} ${randomUUID().slice(0, 6)}`}) returning id`;
  await sql`insert into owned_pokemon (guest_id, dex, level, is_partner) values (${guest!.id}, 4, 1, true)`;
  return guest!.id as GuestId;
}

// A race of Alex (host), Zoe and Nina that started ten minutes ago, with everyone's page counted as connected all along so only the idle rule can end it.
async function startedRace({ timeLimitSeconds = null, bots = 0 }: RaceOptions = {}): Promise<Race> {
  const alex = await insertRacer('Alex');
  const roomId = (await openRoom(database, { hostGuestId: alex, visibility: 'unlisted', openedAt: new Date() })) as RoomId;
  const zoe = await insertRacer('Zoe');
  const nina = await insertRacer('Nina');
  await joinRoom(database, { roomId, guestId: zoe, joinedAt: new Date() });
  await joinRoom(database, { roomId, guestId: nina, joinedAt: new Date() });
  const startsAt = new Date(Date.now() - 10 * 60_000);
  const deadlineAt = new Date(startsAt.getTime() + (timeLimitSeconds ?? gameConfig.race.timeLimit.safetyCeilingSeconds) * 1000);
  const [race] = await sql`insert into races (room_id, passage, starts_at, deadline_at, time_limit_seconds) values (${roomId}, ${passage}, ${startsAt.toISOString()}::timestamptz, ${deadlineAt.toISOString()}::timestamptz, ${timeLimitSeconds}) returning id`;
  const raceId = race!.id as string;
  await sql`
    insert into race_participants (race_id, guest_id, partner_dex, partner_pokemon_id, last_seen_at)
    select ${raceId}, m.guest_id, p.dex, p.id, ${new Date(startsAt.getTime() + 3_600_000).toISOString()}::timestamptz
    from room_members m join owned_pokemon p on p.guest_id = m.guest_id and p.is_partner where m.room_id = ${roomId}`;
  for (const character of botCharacters.slice(0, bots)) await sql`insert into race_bots (race_id, character, level, seed) values (${raceId}, ${character.id}, 'novice', 1)`;
  await sql`update rooms set phase = 'countdown' where id = ${roomId}`;
  return { roomId, raceId, startsAt, alex: { guestId: alex }, zoe: { guestId: zoe }, nina: { guestId: nina } };
}

function at(race: Race, elapsedMs: number): Date {
  return new Date(race.startsAt.getTime() + elapsedMs);
}

async function typedAt(race: Race, racer: Racer, elapsedMs: number, position = 5): Promise<void> {
  await sql`update race_participants set last_reported_at = ${at(race, elapsedMs).toISOString()}::timestamptz, position = ${position}, correct_characters = ${position}, keystrokes = ${position}, last_sequence = 1 where race_id = ${race.raceId} and guest_id = ${racer.guestId}`;
}

async function markFinished(race: Race, racer: Racer, elapsedMs: number): Promise<void> {
  await sql`update race_participants set finished_at = ${at(race, elapsedMs).toISOString()}::timestamptz, last_reported_at = ${at(race, elapsedMs).toISOString()}::timestamptz, position = ${passageLength(passage)}, correct_characters = ${passageLength(passage)}, keystrokes = ${passageLength(passage)} where race_id = ${race.raceId} and guest_id = ${racer.guestId}`;
}

async function readRace(race: Race) {
  const [row] = await sql`select ended_at, ended_for_inactivity from races where id = ${race.raceId}`;
  const participants = await sql`select guest_id, place, finished_at, abandoned_at from race_participants where race_id = ${race.raceId}`;
  return { endedAt: row!.ended_at === null ? null : new Date(row!.ended_at as string), endedForInactivity: row!.ended_for_inactivity as boolean, participants };
}

async function countRewards(race: Race): Promise<{ xp: number; coins: number }> {
  const [xp] = await sql`select count(*)::int as total from xp_grants where race_id = ${race.raceId}`;
  const [coins] = await sql`select count(*)::int as total from coin_entries where race_id = ${race.raceId}`;
  return { xp: xp!.total as number, coins: coins!.total as number };
}

describe('ending a race nobody types in', () => {
  it('stays open until the idle delay, then ends once at that moment with the inactivity flag', async () => {
    const race = await startedRace();
    await typedAt(race, race.zoe, 30_000, 12);
    await typedAt(race, race.nina, 20_000, 4);

    expect(await settleDueRace(database, race.roomId, at(race, 30_000 + idleMs - 1))).toBe(false);
    expect(await settleDueRace(database, race.roomId, at(race, 30_000 + idleMs))).toBe(true);

    const settled = await readRace(race);
    expect(settled.endedAt).toEqual(at(race, 30_000 + idleMs));
    expect(settled.endedForInactivity).toBe(true);
    const places = new Map(settled.participants.map((row) => [row.guest_id as string, row.place as number]));
    expect(places.get(race.zoe.guestId)).toBe(1);
    expect(places.get(race.nina.guestId)).toBe(2);
    expect(places.get(race.alex.guestId)).toBe(3);
    expect(settled.participants.every((row) => row.finished_at === null && row.abandoned_at === null)).toBe(true);
  });

  it('keeps a race alive while one racer types inside the delay, however idle the others are', async () => {
    const race = await startedRace();
    await typedAt(race, race.zoe, 100_000);
    expect(await settleDueRace(database, race.roomId, at(race, 100_000 + idleMs - 1))).toBe(false);
    await typedAt(race, race.zoe, 100_000 + idleMs - 30_000, 9);
    expect(await settleDueRace(database, race.roomId, at(race, 100_000 + idleMs))).toBe(false);
    expect((await readRace(race)).endedAt).toBeNull();
  });

  it('measures from the start when nobody typed', async () => {
    const race = await startedRace();
    expect(await settleDueRace(database, race.roomId, at(race, idleMs - 1))).toBe(false);
    expect(await settleDueRace(database, race.roomId, at(race, idleMs))).toBe(true);
  });

  it('counts only the racers still racing: a finisher and an abandoner do not keep it alive', async () => {
    const race = await startedRace();
    await markFinished(race, race.zoe, 90_000);
    await sql`update race_participants set abandoned_at = ${at(race, 50_000).toISOString()}::timestamptz, last_reported_at = ${at(race, 50_000).toISOString()}::timestamptz where race_id = ${race.raceId} and guest_id = ${race.nina.guestId}`;
    await typedAt(race, race.alex, 60_000);

    expect(await settleDueRace(database, race.roomId, at(race, 60_000 + idleMs - 1))).toBe(false);
    expect(await settleDueRace(database, race.roomId, at(race, 60_000 + idleMs))).toBe(true);
    expect((await readRace(race)).endedForInactivity).toBe(true);
  });

  it('is not kept alive by bots', async () => {
    const race = await startedRace({ bots: 2 });
    expect(await settleDueRace(database, race.roomId, at(race, idleMs))).toBe(true);
    expect((await readRace(race)).endedForInactivity).toBe(true);
  });

  it('ends at a shorter time limit without the inactivity flag', async () => {
    const race = await startedRace({ timeLimitSeconds: 120 });
    expect(await settleDueRace(database, race.roomId, at(race, 2 * idleMs))).toBe(true);
    const settled = await readRace(race);
    expect(settled.endedAt).toEqual(at(race, 120_000));
    expect(settled.endedForInactivity).toBe(false);
  });

  it('pays each human the reward of their place once, however many readers settle it', async () => {
    const race = await startedRace({ bots: 1 });
    await typedAt(race, race.zoe, 10_000);
    const now = at(race, 10_000 + idleMs);

    const settledBy = await Promise.all([1, 2, 3].map(() => settleDueRace(database, race.roomId, now)));
    await settleDueRace(database, race.roomId, new Date(now.getTime() + 1000));

    expect(settledBy.filter(Boolean)).toHaveLength(1);
    expect(await countRewards(race)).toEqual({ xp: 3, coins: 3 });
  });

  it('shows the results to a member reopening the room five minutes later', async () => {
    const race = await startedRace();
    await typedAt(race, race.zoe, 10_000);
    const reopenedAt = at(race, 10_000 + idleMs + 5 * 60_000);

    const { found, hasChangedRoom } = await loadRoomSnapshot(database, race.roomId, race.zoe.guestId, reopenedAt);
    expect(hasChangedRoom).toBe(true);
    if (found.kind !== 'snapshot') throw new Error('expected a snapshot');
    expect(found.snapshot.phase).toBe('results');
    expect(found.snapshot.race?.endedForInactivity).toBe(true);
    expect(found.snapshot.race?.results).toHaveLength(3);
    const again = await loadRoomSnapshot(database, race.roomId, race.zoe.guestId, reopenedAt);
    expect(again.hasChangedRoom).toBe(false);
    expect(await countRewards(race)).toEqual({ xp: 3, coins: 3 });
  });

  it('refuses a report that arrives after the idle end of a race nobody had read yet', async () => {
    const race = await startedRace();
    const late = at(race, idleMs + 1000);
    const outcome = await reportProgress(database, { roomId: race.roomId, guestId: race.zoe.guestId, report: { sequence: 1, position: 3, correctCharacters: 3, keystrokes: 3, rejectedKeystrokes: 0 }, reportedAt: late });
    expect(outcome.result).toBe('race-over');
    const settled = await readRace(race);
    expect(settled.endedForInactivity).toBe(true);
    expect(settled.endedAt).toEqual(at(race, idleMs));
  });

  it('shows no inactivity line for a race that ended when everyone finished', async () => {
    const race = await startedRace();
    for (const racer of [race.alex, race.zoe, race.nina]) await markFinished(race, racer, 40_000);
    expect(await settleDueRace(database, race.roomId, at(race, 41_000))).toBe(false);
    expect((await readRace(race)).endedForInactivity).toBe(false);
  });

  it('settles a room whose every racer closed their tab, with the usual abandonment rules', async () => {
    const race = await startedRace();
    await typedAt(race, race.zoe, 20_000);
    await sql`update race_participants set last_seen_at = ${at(race, 25_000).toISOString()}::timestamptz where race_id = ${race.raceId}`;

    const { found } = await loadRoomSnapshot(database, race.roomId, race.zoe.guestId, at(race, 20_000 + idleMs + 5 * 60_000));

    if (found.kind !== 'snapshot') throw new Error('expected a snapshot');
    expect(found.snapshot.phase).toBe('results');
    const settled = await readRace(race);
    expect(settled.endedAt).not.toBeNull();
    expect(settled.participants.every((row) => row.abandoned_at !== null)).toBe(true);
  });
});
