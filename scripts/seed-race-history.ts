import { and, count, eq, isNotNull } from 'drizzle-orm';
import { raceWordLists } from '../src/assets/word-lists';
import { gameConfig } from '../src/config/game';
import type { GuestId } from '../src/domain/guest-id';
import type { PokedexDex } from '../src/assets/pokedex';
import type { RoomId } from '../src/domain/room-id';
import type { RaceId } from '../src/domain/race';
import { defaultTimeLimit, raceDeadline } from '../src/domain/time-limit';
import { measureRacer, placeRacers, raceRulesVersion, type RacerPerformance } from '../src/domain/race-results';
import { generateRaceText } from '../src/domain/race-text';
import { generateRoomCode } from '../src/domain/room-code';
import { textLanguages, type TextSettings } from '../src/domain/text-settings';
import * as schema from '../src/server/db/schema';
import type { Database, DatabaseTransaction } from '../src/server/db/types';

// Past races for demo accounts, so history, profile and results pages show data right after a fresh install.
// Results use the live scoring formulas; rewards (XP, coins, encounters, badges) are not granted, so seeded collections stay as seeded.
export const seededRaceCount = 12;

const historyDays = 30;

const millisecondsPerDay = 86_400_000;

const wpmRange = { min: 14, max: 52 };

const maxRejectedKeystrokes = 9;

type Random = () => number;

type Partner = { id: string; dex: PokedexDex };

type SeededRacer = { guestId: GuestId; outcome: 'finished'; performance: RacerPerformance; finishedAt: Date };

// Returns how many races were created. A trainer who already has that many settled races gets none, so running the seed again duplicates nothing.
export async function seedRaceHistory(database: Database, racers: readonly GuestId[], seed: number): Promise<number> {
  const [firstRacer] = racers;
  if (!firstRacer || (await countSettledRaces(database, firstRacer)) >= seededRaceCount) return 0;
  const random = seededRandom(seed);
  for (let raceIndex = 0; raceIndex < seededRaceCount; raceIndex += 1) {
    await database.transaction((transaction) => insertSettledRace(transaction, racers, raceIndex, random));
  }
  return seededRaceCount;
}

async function countSettledRaces(database: Database, guestId: GuestId): Promise<number> {
  const [row] = await database
    .select({ total: count() })
    .from(schema.raceParticipants)
    .innerJoin(schema.races, eq(schema.races.id, schema.raceParticipants.raceId))
    .where(and(eq(schema.raceParticipants.guestId, guestId), isNotNull(schema.races.endedAt)));
  return row?.total ?? 0;
}

async function insertSettledRace(transaction: DatabaseTransaction, racers: readonly GuestId[], raceIndex: number, random: Random): Promise<void> {
  const settings = textSettingsFor(raceIndex);
  const startsAt = startOf(raceIndex, random);
  const passage = generateRaceText(settings, raceWordLists, (size) => Math.floor(random() * size));
  const roomId = await insertClosedRoom(transaction, racers[0]!, settings, startsAt, random);
  const seeded = racers.map((guestId) => finishedRacer(guestId, passage, startsAt, random));
  const endedAt = new Date(Math.max(...seeded.map((racer) => racer.finishedAt.getTime())));
  const [race] = await transaction
    .insert(schema.races)
    .values({ roomId, passage, textLanguage: settings.language, startsAt, deadlineAt: raceDeadline(startsAt, defaultTimeLimit), timeLimitSeconds: defaultTimeLimit, createdAt: startsAt, endedAt, rulesVersion: raceRulesVersion })
    .returning({ id: schema.races.id });
  for (const racer of placeRacers(seeded)) await insertParticipant(transaction, race!.id, racer);
}

function textSettingsFor(raceIndex: number): TextSettings {
  const language = textLanguages[raceIndex % textLanguages.length]!;
  return { language, length: gameConfig.text.defaultLength, ...gameConfig.text.defaultOptions };
}

// Spread evenly over the last 30 days, oldest first, each at a random hour of its day.
function startOf(raceIndex: number, random: Random): Date {
  const daysAgo = historyDays - Math.floor(((raceIndex + 1) * historyDays) / (seededRaceCount + 1));
  const offsetWithinDay = Math.floor(random() * millisecondsPerDay * 0.5);
  return new Date(Date.now() - daysAgo * millisecondsPerDay + offsetWithinDay);
}

async function insertClosedRoom(transaction: DatabaseTransaction, hostGuestId: GuestId, settings: TextSettings, startsAt: Date, random: Random): Promise<RoomId> {
  const [room] = await transaction
    .insert(schema.rooms)
    .values({
      hostGuestId,
      code: generateRoomCode((size) => Math.floor(random() * size)),
      phase: 'closed',
      closeReason: 'host-left',
      createdAt: startsAt,
      lastActivityAt: startsAt,
      textLanguage: settings.language,
      textLength: settings.length,
      textPunctuation: settings.punctuation,
      textAccents: settings.accents,
      textCapitals: settings.capitals,
      textDigits: settings.digits,
    })
    .returning({ id: schema.rooms.id });
  return room!.id;
}

function finishedRacer(guestId: GuestId, passage: string, startsAt: Date, random: Random): SeededRacer {
  const typedCharacters = [...passage].length;
  const wpm = wpmRange.min + random() * (wpmRange.max - wpmRange.min);
  const elapsedMs = Math.round((typedCharacters / gameConfig.scoring.charactersPerWord / wpm) * 60_000);
  const rejectedKeystrokes = Math.floor(random() * (maxRejectedKeystrokes + 1));
  const performance = { typedCharacters, keystrokes: typedCharacters + rejectedKeystrokes, rejectedKeystrokes, elapsedMs };
  return { guestId, outcome: 'finished', performance, finishedAt: new Date(startsAt.getTime() + elapsedMs) };
}

async function insertParticipant(transaction: DatabaseTransaction, raceId: RaceId, racer: SeededRacer & { place: number }): Promise<void> {
  const { grossWpm, rawWpm, score, accuracy } = measureRacer(racer.performance);
  const partner = await findPartner(transaction, racer.guestId);
  await transaction.insert(schema.raceParticipants).values({
    raceId,
    guestId: racer.guestId,
    position: racer.performance.typedCharacters,
    keystrokes: racer.performance.keystrokes,
    rejectedKeystrokes: racer.performance.rejectedKeystrokes,
    lastSequence: 1,
    lastReportedAt: racer.finishedAt,
    finishedAt: racer.finishedAt,
    grossWpm,
    rawWpm,
    score,
    accuracy,
    place: racer.place,
    partnerDex: partner?.dex ?? null,
    partnerPokemonId: partner?.id ?? null,
  });
}

async function findPartner(transaction: DatabaseTransaction, guestId: GuestId): Promise<Partner | null> {
  const [partner] = await transaction
    .select({ id: schema.ownedPokemon.id, dex: schema.ownedPokemon.dex })
    .from(schema.ownedPokemon)
    .where(and(eq(schema.ownedPokemon.guestId, guestId), eq(schema.ownedPokemon.isPartner, true)));
  return partner ?? null;
}

// Mulberry32: the same seed draws the same history on every machine.
function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}
