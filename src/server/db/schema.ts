import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const guests = pgTable('guests', {
  id: uuid('id').primaryKey().defaultRandom(),
  trainerName: text('trainer_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull().unique(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('sessions_expires_at_idx').on(table.expiresAt)],
);

export const rooms = pgTable(
  'rooms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hostGuestId: uuid('host_guest_id')
      .notNull()
      .references(() => guests.id),
    phase: text('phase').notNull().default('waiting'),
    revision: integer('revision').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('rooms_host_guest_id_idx').on(table.hostGuestId),
    check('rooms_phase_check', sql`${table.phase} in ('waiting', 'closed')`),
  ],
);

export const roomMembers = pgTable(
  'room_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('room_members_room_guest_unique').on(table.roomId, table.guestId), index('room_members_guest_id_idx').on(table.guestId)],
);
