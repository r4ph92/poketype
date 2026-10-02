import { sql } from 'drizzle-orm';
import { check, doublePrecision, foreignKey, index, integer, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { GuestId } from '../../domain/guest-id';
import type { RaceId } from '../../domain/race';
import { roomPhases } from '../../domain/room-phase';
import type { RoomId } from '../../domain/room-id';
import type { UserId } from '../../domain/user-id';
import { usernamePattern } from '../../domain/username';

export const guests = pgTable('guests', {
  id: uuid('id').$type<GuestId>().primaryKey().defaultRandom(),
  trainerName: text('trainer_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usernameUniqueIndex = 'users_username_lower_unique';
export const userGuestUniqueConstraint = 'users_guest_id_unique';

export const users = pgTable(
  'users',
  {
    id: uuid('id').$type<UserId>().primaryKey().defaultRandom(),
    username: text('username').notNull(),
    trainerAvatar: text('trainer_avatar'),
    guestId: uuid('guest_id')
      .$type<GuestId>()
      .notNull()
      .references(() => guests.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex(usernameUniqueIndex).on(sql`lower(${table.username})`),
    unique(userGuestUniqueConstraint).on(table.guestId),
    unique('users_id_guest_id_unique').on(table.id, table.guestId),
    check('users_username_check', sql`${table.username} ~ ${sql.raw(`'${usernamePattern.source}'`)}`),
  ],
);

export const passwordCredentials = pgTable(
  'password_credentials',
  {
    userId: uuid('user_id')
      .$type<UserId>()
      .primaryKey()
      .references(() => users.id),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('password_credentials_scrypt_check', sql`${table.passwordHash} like '$scrypt$%'`)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull().unique(),
    guestId: uuid('guest_id')
      .$type<GuestId>()
      .notNull()
      .references(() => guests.id),
    userId: uuid('user_id').$type<UserId>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('sessions_expires_at_idx').on(table.expiresAt),
    index('sessions_guest_id_idx').on(table.guestId),
    foreignKey({
      name: 'sessions_user_guest_fk',
      columns: [table.userId, table.guestId],
      foreignColumns: [users.id, users.guestId],
    }),
  ],
);

export const rooms = pgTable(
  'rooms',
  {
    id: uuid('id').$type<RoomId>().primaryKey().defaultRandom(),
    hostGuestId: uuid('host_guest_id')
      .$type<GuestId>()
      .notNull()
      .references(() => guests.id),
    phase: text('phase', { enum: roomPhases }).notNull().default('waiting'),
    revision: integer('revision').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('rooms_host_guest_id_idx').on(table.hostGuestId),
    check('rooms_phase_check', sql`${table.phase} in (${sql.raw(roomPhases.map((phase) => `'${phase}'`).join(', '))})`),
  ],
);

export const roomMembers = pgTable(
  'room_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id')
      .$type<RoomId>()
      .notNull()
      .references(() => rooms.id),
    guestId: uuid('guest_id')
      .$type<GuestId>()
      .notNull()
      .references(() => guests.id),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('room_members_room_guest_unique').on(table.roomId, table.guestId), index('room_members_guest_id_idx').on(table.guestId)],
);

export const races = pgTable(
  'races',
  {
    id: uuid('id').$type<RaceId>().primaryKey().defaultRandom(),
    roomId: uuid('room_id')
      .$type<RoomId>()
      .notNull()
      .references(() => rooms.id),
    passage: text('passage').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    rulesVersion: integer('rules_version'),
  },
  (table) => [
    index('races_room_id_created_at_idx').on(table.roomId, table.createdAt),
    check('races_passage_not_empty', sql`length(${table.passage}) > 0`),
    check('races_deadline_after_start_check', sql`${table.deadlineAt} > ${table.startsAt}`),
    check('races_ended_after_start_check', sql`${table.endedAt} is null or ${table.endedAt} >= ${table.startsAt}`),
    check('races_settled_with_rules_check', sql`(${table.endedAt} is null) = (${table.rulesVersion} is null)`),
  ],
);

// The fixed set of players of a race, written by the start command. Free entry (#32) can type characters it does not count, so the check keeps >=.
export const raceParticipants = pgTable(
  'race_participants',
  {
    raceId: uuid('race_id')
      .$type<RaceId>()
      .notNull()
      .references(() => races.id),
    guestId: uuid('guest_id')
      .$type<GuestId>()
      .notNull()
      .references(() => guests.id),
    position: integer('position').notNull().default(0),
    keystrokes: integer('keystrokes').notNull().default(0),
    rejectedKeystrokes: integer('rejected_keystrokes').notNull().default(0),
    lastSequence: integer('last_sequence').notNull().default(0),
    lastReportedAt: timestamp('last_reported_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    abandonedAt: timestamp('abandoned_at', { withTimezone: true }),
    grossWpm: doublePrecision('gross_wpm'),
    score: doublePrecision('score'),
    accuracy: doublePrecision('accuracy'),
    place: integer('place'),
  },
  (table) => [
    primaryKey({ columns: [table.raceId, table.guestId] }),
    index('race_participants_guest_id_idx').on(table.guestId),
    check(
      'race_participants_counters_check',
      sql`${table.position} >= 0 and ${table.keystrokes} >= 0 and ${table.rejectedKeystrokes} >= 0 and ${table.lastSequence} >= 0`,
    ),
    check('race_participants_abandoned_unfinished_check', sql`${table.abandonedAt} is null or ${table.finishedAt} is null`),
    check('race_participants_rejected_check', sql`${table.keystrokes} >= ${table.rejectedKeystrokes}`),
    check('race_participants_position_check', sql`${table.keystrokes} - ${table.rejectedKeystrokes} >= ${table.position}`),
    check(
      'race_participants_settled_together_check',
      sql`(${table.grossWpm} is null) = (${table.score} is null) and (${table.score} is null) = (${table.accuracy} is null) and (${table.accuracy} is null) = (${table.place} is null)`,
    ),
    check(
      'race_participants_results_range_check',
      sql`${table.place} >= 1 and ${table.accuracy} between 0 and 1 and ${table.grossWpm} >= 0 and ${table.score} >= 0`,
    ),
  ],
);
