import { sql } from 'drizzle-orm';
import { boolean, check, doublePrecision, foreignKey, index, integer, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { PokedexDex } from '../../assets/pokedex';
import { gameConfig } from '../../config/game';
import { badgeIds, type BadgeId } from '../../domain/badges';
import type { GuestId } from '../../domain/guest-id';
import { firstDex, lastDex } from '../../domain/pokemon-catalog';
import type { RaceId } from '../../domain/race';
import { roomCodePattern, type RoomCode } from '../../domain/room-code';
import { roomCloseReasons, roomPhases } from '../../domain/room-phase';
import type { RoomId } from '../../domain/room-id';
import { roomVisibilities } from '../../domain/room-visibility';
import { textLanguages } from '../../domain/text-settings';
import { evolutionItemIds, shopItemIds, type EvolutionItemId, type ShopItemId } from '../../domain/shop-item';
import type { UserId } from '../../domain/user-id';
import { usernamePattern } from '../../domain/username';
import { encounterStatuses, type EncounterStatus } from '../../domain/wild-encounter';
import { legendaryRewards } from '../../config/achievements';

// coins is the Poké Dollar wallet: the check keeps it from ever going negative, and coin_entries records every change to it.
// pcBoxes is how many PC boxes the trainer owns, each holding gameConfig.storage.boxSlots Pokémon.
export const guests = pgTable(
  'guests',
  {
    id: uuid('id').$type<GuestId>().primaryKey().defaultRandom(),
    trainerName: text('trainer_name').notNull(),
    coins: integer('coins').notNull().default(0),
    pcBoxes: integer('pc_boxes').notNull().default(gameConfig.storage.startingBoxes),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('guests_coins_check', sql`${table.coins} >= 0`), check('guests_pc_boxes_check', sql`${table.pcBoxes} >= 1`)],
);

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

// No foreign key: failures for unknown usernames are counted too, under the same key a real account would have.
export const loginFailures = pgTable(
  'login_failures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usernameKey: text('username_key').notNull(),
    failedAt: timestamp('failed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('login_failures_username_key_failed_at_idx').on(table.usernameKey, table.failedAt)],
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

export const roomCodeUniqueConstraint = 'rooms_code_unique';

const textLanguageList = textLanguages.map((language) => `'${language}'`).join(', ');

export const rooms = pgTable(
  'rooms',
  {
    id: uuid('id').$type<RoomId>().primaryKey().defaultRandom(),
    hostGuestId: uuid('host_guest_id')
      .$type<GuestId>()
      .notNull()
      .references(() => guests.id),
    code: text('code').$type<RoomCode>().notNull(),
    visibility: text('visibility', { enum: roomVisibilities }).notNull().default('public'),
    phase: text('phase', { enum: roomPhases }).notNull().default('waiting'),
    revision: integer('revision').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
    closeReason: text('close_reason', { enum: roomCloseReasons }),
    textLanguage: text('text_language', { enum: textLanguages }).notNull().default('fr'),
    textLength: integer('text_length').notNull().default(gameConfig.text.defaultLength),
    textPunctuation: boolean('text_punctuation').notNull().default(gameConfig.text.defaultOptions.punctuation),
    textAccents: boolean('text_accents').notNull().default(gameConfig.text.defaultOptions.accents),
    textCapitals: boolean('text_capitals').notNull().default(gameConfig.text.defaultOptions.capitals),
    textDigits: boolean('text_digits').notNull().default(gameConfig.text.defaultOptions.digits),
  },
  (table) => [
    index('rooms_host_guest_id_idx').on(table.hostGuestId),
    check('rooms_text_language_check', sql`${table.textLanguage} in (${sql.raw(textLanguageList)})`),
    check('rooms_text_length_check', sql`${table.textLength} between ${sql.raw(String(gameConfig.text.minLength))} and ${sql.raw(String(gameConfig.text.maxLength))}`),
    unique(roomCodeUniqueConstraint).on(table.code),
    check('rooms_code_check', sql`${table.code} ~ ${sql.raw(`'${roomCodePattern.source}'`)}`),
    check('rooms_visibility_check', sql`${table.visibility} in (${sql.raw(roomVisibilities.map((visibility) => `'${visibility}'`).join(', '))})`),
    check('rooms_phase_check', sql`${table.phase} in (${sql.raw(roomPhases.map((phase) => `'${phase}'`).join(', '))})`),
    check('rooms_close_reason_check', sql`${table.closeReason} in (${sql.raw(roomCloseReasons.map((reason) => `'${reason}'`).join(', '))})`),
  ],
);

// Unknown room codes per guest, read by the code throttle; a guest is one session's player, so the key needs no account.
export const roomCodeFailures = pgTable(
  'room_code_failures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guestId: uuid('guest_id')
      .$type<GuestId>()
      .notNull()
      .references(() => guests.id),
    failedAt: timestamp('failed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('room_code_failures_guest_id_failed_at_idx').on(table.guestId, table.failedAt)],
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

// A player the host removed from the waiting room, so their open page says why it went home; joining the room again deletes the row.
export const roomRemovals = pgTable(
  'room_removals',
  {
    roomId: uuid('room_id')
      .$type<RoomId>()
      .notNull()
      .references(() => rooms.id),
    guestId: uuid('guest_id')
      .$type<GuestId>()
      .notNull()
      .references(() => guests.id),
    removedAt: timestamp('removed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.roomId, table.guestId] }), index('room_removals_guest_id_idx').on(table.guestId)],
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
    textLanguage: text('text_language', { enum: textLanguages }).notNull().default('fr'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    rulesVersion: integer('rules_version'),
  },
  (table) => [
    index('races_room_id_created_at_idx').on(table.roomId, table.createdAt),
    check('races_passage_not_empty', sql`length(${table.passage}) > 0`),
    check('races_text_language_check', sql`${table.textLanguage} in (${sql.raw(textLanguageList)})`),
    check('races_deadline_after_start_check', sql`${table.deadlineAt} > ${table.startsAt}`),
    check('races_ended_after_start_check', sql`${table.endedAt} is null or ${table.endedAt} >= ${table.startsAt}`),
    check('races_settled_with_rules_check', sql`(${table.endedAt} is null) = (${table.rulesVersion} is null)`),
  ],
);

// The fixed set of players of a race, written by the start command. Free entry (#32) can type characters it does not count, so the check keeps >=.
// inactiveAt marks a racer the host removed from the race after a minute without progress: out of the ranking like an abandoner, but still in the room.
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
    inactiveAt: timestamp('inactive_at', { withTimezone: true }),
    grossWpm: doublePrecision('gross_wpm'),
    score: doublePrecision('score'),
    accuracy: doublePrecision('accuracy'),
    place: integer('place'),
    partnerDex: integer('partner_dex').$type<PokedexDex>(),
    partnerPokemonId: uuid('partner_pokemon_id').references(() => ownedPokemon.id, { onDelete: 'set null' }),
  },
  (table) => [
    primaryKey({ columns: [table.raceId, table.guestId] }),
    index('race_participants_guest_id_idx').on(table.guestId),
    check(
      'race_participants_counters_check',
      sql`${table.position} >= 0 and ${table.keystrokes} >= 0 and ${table.rejectedKeystrokes} >= 0 and ${table.lastSequence} >= 0`,
    ),
    check('race_participants_abandoned_unfinished_check', sql`${table.abandonedAt} is null or ${table.finishedAt} is null`),
    check('race_participants_inactive_alone_check', sql`${table.inactiveAt} is null or (${table.finishedAt} is null and ${table.abandonedAt} is null)`),
    check('race_participants_rejected_check', sql`${table.keystrokes} >= ${table.rejectedKeystrokes}`),
    check('race_participants_position_check', sql`${table.keystrokes} - ${table.rejectedKeystrokes} >= ${table.position}`),
    check(
      'race_participants_settled_together_check',
      sql`(${table.grossWpm} is null) = (${table.score} is null) and (${table.score} is null) = (${table.accuracy} is null) and (${table.accuracy} is null) = (${table.place} is null)`,
    ),
    check('race_participants_partner_dex_check', sql`${table.partnerDex} between ${sql.raw(String(firstDex))} and ${sql.raw(String(lastDex))}`),
    check(
      'race_participants_results_range_check',
      sql`${table.place} >= 1 and ${table.accuracy} between 0 and 1 and ${table.grossWpm} >= 0 and ${table.score} >= 0`,
    ),
  ],
);

export const ownedPokemonPartnerIndex = 'owned_pokemon_one_partner_unique';

// A collection belongs to a guest identity, so a guest's Pokémon stay theirs when the guest becomes an account (H2). It may hold several of one species.
export const ownedPokemon = pgTable(
  'owned_pokemon',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guestId: uuid('guest_id')
      .$type<GuestId>()
      .notNull()
      .references(() => guests.id),
    dex: integer('dex').$type<PokedexDex>().notNull(),
    level: integer('level').notNull(),
    xp: integer('xp').notNull().default(0),
    isPartner: boolean('is_partner').notNull().default(false),
    caughtAt: timestamp('caught_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('owned_pokemon_guest_id_idx').on(table.guestId),
    uniqueIndex(ownedPokemonPartnerIndex).on(table.guestId).where(sql`${table.isPartner}`),
    check('owned_pokemon_dex_check', sql`${table.dex} between ${sql.raw(String(firstDex))} and ${sql.raw(String(lastDex))}`),
    check('owned_pokemon_level_check', sql`${table.level} between 1 and ${sql.raw(String(gameConfig.progression.maxLevel))}`),
    check('owned_pokemon_xp_check', sql`${table.xp} >= 0`),
  ],
);

// The primary key makes each badge a one-time grant; raceId names the settled race that granted it, null for a seeded badge.
export const earnedBadges = pgTable(
  'earned_badges',
  {
    guestId: uuid('guest_id')
      .$type<GuestId>()
      .notNull()
      .references(() => guests.id),
    badge: text('badge').$type<BadgeId>().notNull(),
    raceId: uuid('race_id')
      .$type<RaceId>()
      .references(() => races.id),
    earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.guestId, table.badge] }),
    check('earned_badges_badge_check', sql`${table.badge} in (${sql.raw(badgeIds.map((badge) => `'${badge}'`).join(', '))})`),
  ],
);

// The XP ledger: one row per race participant, so a race grants its XP exactly once. It keeps the raced Pokémon before and after the grant,
// which the results screen replays and the Pokédex reads to keep an evolved-from form caught.
export const xpGrants = pgTable(
  'xp_grants',
  {
    raceId: uuid('race_id').$type<RaceId>().notNull(),
    guestId: uuid('guest_id').$type<GuestId>().notNull(),
    xp: integer('xp').notNull(),
    dexBefore: integer('dex_before').$type<PokedexDex>().notNull(),
    levelBefore: integer('level_before').notNull(),
    xpBefore: integer('xp_before').notNull(),
    dexAfter: integer('dex_after').$type<PokedexDex>().notNull(),
    levelAfter: integer('level_after').notNull(),
    xpAfter: integer('xp_after').notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.raceId, table.guestId] }),
    foreignKey({ name: 'xp_grants_participant_fk', columns: [table.raceId, table.guestId], foreignColumns: [raceParticipants.raceId, raceParticipants.guestId] }),
    index('xp_grants_guest_id_idx').on(table.guestId),
    check('xp_grants_xp_check', sql`${table.xp} >= 0 and ${table.xpBefore} >= 0 and ${table.xpAfter} >= 0`),
    check('xp_grants_dex_check', sql`${table.dexBefore} between ${sql.raw(String(firstDex))} and ${sql.raw(String(lastDex))} and ${table.dexAfter} between ${sql.raw(String(firstDex))} and ${sql.raw(String(lastDex))}`),
    check('xp_grants_level_check', sql`${table.levelBefore} between 1 and ${table.levelAfter} and ${table.levelAfter} <= ${sql.raw(String(gameConfig.progression.maxLevel))}`),
  ],
);

const coinReasons = ['race', 'badge', 'purchase', 'seed'] as const;

export type CoinReason = (typeof coinReasons)[number];

const shopItemList = shopItemIds.map((item) => `'${item}'`).join(', ');

// The Poké Dollar ledger: earned amounts are positive, purchases negative. The partial unique indexes make a race payout, a badge bonus
// and a purchase request each happen once per trainer; raceId also names the race that granted a badge bonus.
export const coinEntries = pgTable(
  'coin_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guestId: uuid('guest_id')
      .$type<GuestId>()
      .notNull()
      .references(() => guests.id),
    reason: text('reason').$type<CoinReason>().notNull(),
    amount: integer('amount').notNull(),
    raceId: uuid('race_id').$type<RaceId>(),
    badge: text('badge').$type<BadgeId>(),
    purchaseKey: uuid('purchase_key'),
    item: text('item').$type<ShopItemId>(),
    quantity: integer('quantity'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('coin_entries_guest_id_idx').on(table.guestId),
    uniqueIndex('coin_entries_race_unique').on(table.raceId, table.guestId).where(sql`${table.reason} = 'race'`),
    uniqueIndex('coin_entries_badge_unique').on(table.guestId, table.badge).where(sql`${table.reason} = 'badge'`),
    uniqueIndex('coin_entries_purchase_unique').on(table.guestId, table.purchaseKey).where(sql`${table.reason} = 'purchase'`),
    foreignKey({ name: 'coin_entries_participant_fk', columns: [table.raceId, table.guestId], foreignColumns: [raceParticipants.raceId, raceParticipants.guestId] }),
    check('coin_entries_reason_check', sql`${table.reason} in (${sql.raw(coinReasons.map((reason) => `'${reason}'`).join(', '))})`),
    check(
      'coin_entries_shape_check',
      sql`case ${table.reason}
        when 'race' then ${table.raceId} is not null and ${table.amount} >= 0
        when 'badge' then ${table.badge} is not null and ${table.amount} > 0
        when 'purchase' then ${table.purchaseKey} is not null and ${table.item} in (${sql.raw(shopItemList)}) and ${table.quantity} > 0 and ${table.amount} < 0
        else ${table.amount} > 0 end`,
    ),
  ],
);

// The bag: one row per item a trainer has ever held; quantity never goes below zero.
export const bagItems = pgTable(
  'bag_items',
  {
    guestId: uuid('guest_id')
      .$type<GuestId>()
      .notNull()
      .references(() => guests.id),
    item: text('item').$type<ShopItemId>().notNull(),
    quantity: integer('quantity').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.guestId, table.item] }),
    check('bag_items_item_check', sql`${table.item} in (${sql.raw(shopItemList)})`),
    check('bag_items_quantity_check', sql`${table.quantity} >= 0`),
  ],
);

// Every evolution caused by a stone or an evolution item, so the Pokédex keeps the form a Pokémon evolved from, as xp_grants does for level evolutions.
// The table and column keep their first names (stone_evolutions, stone) from when only stones existed, so no data moves.
export const itemEvolutions = pgTable(
  'stone_evolutions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guestId: uuid('guest_id')
      .$type<GuestId>()
      .notNull()
      .references(() => guests.id),
    item: text('stone').$type<EvolutionItemId>().notNull(),
    dexBefore: integer('dex_before').$type<PokedexDex>().notNull(),
    dexAfter: integer('dex_after').$type<PokedexDex>().notNull(),
    evolvedAt: timestamp('evolved_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('stone_evolutions_guest_id_idx').on(table.guestId),
    check('stone_evolutions_stone_check', sql`${table.item} in (${sql.raw(evolutionItemIds.map((item) => `'${item}'`).join(', '))})`),
    check('stone_evolutions_dex_check', sql`${table.dexBefore} between ${sql.raw(String(firstDex))} and ${sql.raw(String(lastDex))} and ${table.dexAfter} between ${sql.raw(String(firstDex))} and ${sql.raw(String(lastDex))}`),
  ],
);

const dexRange = `between ${firstDex} and ${lastDex}`;

// One wild Pokémon a race put in a trainer's queue: the unique key gives each race participant at most one, and throwsUsed counts the Poké Balls spent on it.
export const wildEncounters = pgTable(
  'wild_encounters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guestId: uuid('guest_id')
      .$type<GuestId>()
      .notNull()
      .references(() => guests.id),
    raceId: uuid('race_id').$type<RaceId>().notNull(),
    dex: integer('dex').$type<PokedexDex>().notNull(),
    level: integer('level').notNull(),
    throwsUsed: integer('throws_used').notNull().default(0),
    status: text('status').$type<EncounterStatus>().notNull().default('waiting'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => [
    unique('wild_encounters_race_guest_unique').on(table.raceId, table.guestId),
    foreignKey({ name: 'wild_encounters_participant_fk', columns: [table.raceId, table.guestId], foreignColumns: [raceParticipants.raceId, raceParticipants.guestId] }),
    index('wild_encounters_guest_status_idx').on(table.guestId, table.status),
    check('wild_encounters_dex_check', sql`${table.dex} ${sql.raw(dexRange)}`),
    check('wild_encounters_level_check', sql`${table.level} between ${sql.raw(String(gameConfig.encounters.minLevel))} and ${sql.raw(String(gameConfig.encounters.maxLevel))}`),
    check('wild_encounters_throws_check', sql`${table.throwsUsed} between 0 and ${sql.raw(String(gameConfig.encounters.maxThrows))}`),
    check('wild_encounters_status_check', sql`${table.status} in (${sql.raw(encounterStatuses.map((status) => `'${status}'`).join(', '))})`),
    check('wild_encounters_resolved_check', sql`(${table.status} = 'waiting') = (${table.resolvedAt} is null)`),
  ],
);

// Every Poké Ball thrown: the primary key lets each throw of an encounter happen once, so a repeated request never spends a second ball.
export const encounterThrows = pgTable(
  'encounter_throws',
  {
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => wildEncounters.id),
    throwNumber: integer('throw_number').notNull(),
    caught: boolean('caught').notNull(),
    thrownAt: timestamp('thrown_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.encounterId, table.throwNumber] }),
    check('encounter_throws_number_check', sql`${table.throwNumber} between 1 and ${sql.raw(String(gameConfig.encounters.maxThrows))}`),
  ],
);

// A legendary earned by meeting its goals, once per trainer (primary key). claimedAt stays null while a full PC keeps it waiting for a free place.
export const legendaryGrants = pgTable(
  'legendary_grants',
  {
    guestId: uuid('guest_id')
      .$type<GuestId>()
      .notNull()
      .references(() => guests.id),
    dex: integer('dex').$type<PokedexDex>().notNull(),
    raceId: uuid('race_id')
      .$type<RaceId>()
      .references(() => races.id),
    earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow(),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.guestId, table.dex] }),
    check('legendary_grants_dex_check', sql`${table.dex} in (${sql.raw(legendaryRewards.map((reward) => reward.dex).join(', '))})`),
  ],
);

// Every Pokémon a trainer released, so the Pokédex keeps the species caught after it leaves the collection.
export const releasedPokemon = pgTable(
  'released_pokemon',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guestId: uuid('guest_id')
      .$type<GuestId>()
      .notNull()
      .references(() => guests.id),
    dex: integer('dex').$type<PokedexDex>().notNull(),
    level: integer('level').notNull(),
    releasedAt: timestamp('released_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('released_pokemon_guest_id_idx').on(table.guestId), check('released_pokemon_dex_check', sql`${table.dex} ${sql.raw(dexRange)}`)],
);
