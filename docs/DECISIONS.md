# Decisions, assumptions and unresolved questions

## Confirmed by the user

Online races against other players; players select a Pokémon racer; evolution requires grinding through races; random post-game drops grow the collection; top-down race visuals; fully retro old-game interface (first race mockup). The user requested mockups for stats, XP, collection and lobby, then this implementation handoff. Nickname support and badges were not finalized.

Decided on 2026-09-30, detailed in [PROGRESSION.md](PROGRESSION.md):

- Race XP depends on final place (150 / 120 / 100 / 80 for finishers, 40 unfinished, 0 abandoned) and each level has a fixed XP cost (`50 + 10 × level`, levels 5 to 50).
- The player picks a starter from a pool of ten. Post-race drops draw from every catchable Kanto base-form species by rarity tier.
- Copyright: PokéType is a non-commercial educational school project. The README and a footer on every page say so and credit the rights holders; the site earns no money (see [Legal notice](#legal-notice)).

## Source proposals H1–H8, not confirmed answers

| Hypothesis | Development baseline from source |
| --- | --- |
| H1 | Join waiting rooms only; creator is host; closed-room invitation link usable once. |
| H2 | Guest session linked to same browser during visit; transfer results only on new account creation. |
| H3 | Five characters per word. Gross WPM = typed characters / 5 / elapsed minutes. Corrected score = max(0, gross WPM − penalizable errors / elapsed minutes). Penalizable errors = final errors in free mode, rejected keystrokes in blocked mode. Accuracy = correct keystrokes / all keystrokes. Rank by score descending, accuracy descending, finish time ascending; persistent ties remain ties. Incomplete entries evaluated at time limit; abandoned entries separate. |
| H4 | End on earliest applicable condition: normal maximum duration, all remaining participants finished, three minutes without gameplay activity, or thirty-minute safety ceiling from start. Disconnect does not pause time; reconnect before end restores progress. Abandoners do not delay completion. |
| H5 | Classic default; separate bonus mode. Practice records use classic races; history records language, error mode and bonuses. |
| H6 | At least two humans even if bots exist; finite technical capacity requires validation. |
| H7 | Each selected character occurs at least three times; reject impossible length/character combinations before starting. |
| H8 | Race on desktop with physical keyboard; other pages responsive. |

For H3, explicitly define character accounting and correct-keystroke counters for deletion, replacement, paste, composition and Unicode normalization before coding tests. Do not count backspaces as progress or let repeated edits inflate WPM. This is an implementation clarification, not a confirmed source rule. Live ranking is provisional and may change when penalties settle.

## Proposed defaults to unblock development

These are reversible recommendations, not client commitments. Put them in typed configuration and expose appropriate host settings.

- French initial UI locale, optional English UI; exercise language controlled separately by host. Mockup English labels become translations.
- Default normal race limit: 180 seconds, configurable. Preserve independent H4 inactivity and safety deadlines.
- Classic species/evolution are cosmetic; position comes from normalized typing progress, not species speed. Adjusted ranking is also displayed.
- Provide an explicit development seed/demo account near evolution to demonstrate the loop without changing live reward rules.
- Tentative duplicate policy: a duplicate species drop becomes 50 bonus XP for the racer. Revisit once the loop is playable; the user has not chosen this policy.
- Guests get session-scoped collection/XP too; new-account conversion atomically transfers both races and collection. Guest progression persistence is an extension of H2, not an explicit school requirement.
- XP and drops are settled by the server from the final result: abandoned races grant nothing, an unfinished result at the time limit grants 40 XP. Reward eligibility is separate from ranking.
- Readiness indicators are informational; only the host can start after valid settings and two humans are present. A requirement that everyone be ready is optional, not in SAL-3.
- Temporary host-disconnect baseline: preserve room for reconnect, prevent unauthorized launches, and close waiting room after a documented configurable grace period (proposed 60 seconds). Running race still follows H4; no surprise pause. Host transfer is later work.
- Technical room capacity is configurable and measured, not a permanent four-player cap. Set and document a conservative local default after load testing; show a useful admission error if capacity is reached.
- Local password authentication has no reset UX. State this before signup, per AUTH-1; do not invent email collection.

## Questions that remain open

The original Q1–Q13 remain unanswered; read them in the source. They cover bonus record eligibility, scoring/penalties/ties, incomplete races, guest retention/account linking, expected scale/hosting budget, deadlines/reconnection/host departure, bot roles, invite expiry, custom text generation, keyboard layouts/error counting, forgotten passwords, and reward/bonus activation.

Additional creative choices still open: final duplicate behavior and nickname support. Default to an explicit EVOLVE action once eligible so the moment can be celebrated and players can retain a preferred form. Never present provisional values as already approved.

For keyboard heatmaps, start with a documented physical-key mapping plus character statistics; choose supported layouts explicitly. Accented characters are not always one physical key. For low-priority bonuses, require a documented ruleset before implementation; do not quietly change the classic text.

## Tooling

Chosen by the scaffolding story (#11), not by the school brief.

- Package manager: npm with a committed `package-lock.json`; Node 24 LTS pinned in `.nvmrc` and `engines`.
- ORM and migrations: Drizzle ORM with drizzle-kit over the `postgres` (postgres-js) driver. Migrations are SQL files in `drizzle/`, applied by `scripts/migrate.ts`. The app uses one pooled client per process; move to a pooled connection string if deployed on serverless.
- Migration 0000 created `app_meta`, an empty table that only proved the migration pipeline. Migration 0001 (#12) drops it.
- Unit tests: Vitest, files in `tests/unit/`.
- E2E: Playwright (supports several browser contexts, needed for two-guest races), files in `tests/e2e/`. E2E runs against `TEST_DATABASE_URL`, never the development database.
- i18n: next-intl with no locale in the URL; the request locale is French until #20. The footer renders both languages explicitly.
- Message keys and locale are typed: `src/i18n/global.d.ts` augments next-intl from `messages/fr.json`, so a misspelled namespace or key fails `npm run typecheck`.
- Hard-coded visible strings: ESLint `react/jsx-no-literals` (JSX text, string and template children) plus `no-restricted-syntax` for literals, template literals and ternary/logical branches in `alt`, `title`, `placeholder`, `aria-label`. The rule also flags string and template literals as direct branches of a ternary or `&&`/`||` in JSX children. Known gaps: strings held in variables or returned from helpers, strings nested deeper in expressions, and attributes other than those listed. Review still has to catch those.
- `NextIntlClientProvider` is not mounted. When a client component needs messages, wrap only that subtree with just its namespaces, so the catalog is not serialized into every page.
- `agentRules: false` in `next.config.ts` stops `next dev` from writing an agent-rules block into CLAUDE.md.
- Application code is TypeScript only. The only JavaScript files are tool configs: `eslint.config.mjs` and `postcss.config.mjs`.

## Guest sessions (#12)

- Sessions are server-issued and stored in PostgreSQL behind an opaque cookie token, so a future real-time process can verify them with the same lookup (`src/server/sessions/session-store.ts`, free of Next imports).
- Cookie `poketype_session`: 32 random bytes in base64url, httpOnly, SameSite=Lax, path `/`, Secure in production. The database keeps only the SHA-256 hash of the token. Malformed, unknown, altered and expired values all resolve to "no session"; malformed values never reach the database.
- Identity and credential are separate tables: `guests` (trainer name, not unique) and `sessions` (token hash, expiry, link to the guest). Races and rooms will reference `guests.id`; guests are never hard-deleted while referenced. Accounts (#46) add a user reference to `sessions` and reuse the same cookie mechanism.
- H2 lifetime ("during the visit", provisional): the cookie has no `maxAge`, so closing the browser ends the session, and the server also expires it after 12 hours (`guestSessionLifetimeHours` in `src/config/game.ts`). The "Changer de dresseur" button deletes the session row and the cookie, for shared classroom computers where the browser stays open.
- Trainer name rule: NFC-normalized and trimmed, 2 to 16 characters (code points), starts with a letter or digit, then letters, combining marks, digits, spaces and hyphens. Only the server validates, so the French message is always the server's.
- No auth library for sessions. This departs from the suggestion in `ARCHITECTURE.md`: a library would add a dependency and a model we do not control for a single opaque-token lookup. An auth library may still be chosen for OAuth providers only (#53).
- `app_meta` is removed.
- Follow-ups: purge expired `sessions` rows (and orphan guests) on a schedule; rate-limit guest creation, which is open to anyone today.
- Names are validated on the server only; the input carries `maxLength` 100 (`maxSubmittedLength`) so a paste without JavaScript cannot exceed the 1 MB body limit, and the form stays `noValidate` so the French length message still comes from the server.

## Request protection and error pages (#12)

- Proxy POST rule (`src/proxy.ts`): a POST without an `Origin` header, with `Origin: null`, or with `Sec-Fetch-Site` of `cross-site` or `same-site` gets 403. Next lets a Server Action without Origin through, so this closes that gap. OAuth providers that return through a cross-site `form_post` will need an exception for their callback route in #53.
- Security headers (`next.config.ts`): CSP, `frame-ancestors 'none'`, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, and HSTS in production only. The CSP allows `'unsafe-inline'` for scripts because Next inlines its bootstrap scripts; a nonce-based CSP would make every page dynamic and is deferred. `connect-src 'self'` must be widened to the real-time origin if it is served from a separate host.
- Error pages are French (`src/app/error.tsx`, `src/app/global-error.tsx`). Focus moves to the heading on mount so the error is read and the next Tab reaches "Réessayer". `error.tsx` reads its strings from `NextIntlClientProvider` in the root layout, limited to the `ServerError` and `Footer` namespaces so pages do not ship the whole catalogs. `global-error.tsx` renders outside the layout, so it imports the small slice in `messages/fallback/{fr,en}.json`; a unit test keeps the slice equal to the main catalogs.

## Rooms (#13)

- Model: `rooms` (uuid id, `host_guest_id`, `phase`, `revision`) and `room_members` (surrogate uuid id, room, guest, `joined_at`; unique per room and guest). H1 (provisional): the creator is the host, stored in `rooms.host_guest_id`. The `phase` check allows `waiting`, `countdown`, `racing`, `results` and `closed` (widened by migration 0003 in #14).
- Room ids are lowercase canonical uuids from `gen_random_uuid()`, parsed by `parseRoomId` (a branded `RoomId`) before any query, so a malformed id never reaches PostgreSQL. An uppercase id is treated as malformed: each room has one address.
- Commands and reads are split: `src/server/rooms/room-commands.ts` (writes, one transaction each, no Next imports) and `room-snapshot.ts` (read model). Room creation is a Server Action because it is a plain form; polled or pushed commands in later stories are route handlers that call the same command functions.
- Snapshot and revision: `RoomSnapshot` holds room id, phase, `revision` and members (`memberKey`, trainer name, `isHost`, `isViewer`). It never exposes guest ids and is null unless the viewer is a member. Every membership or phase change must bump `revision` in the same transaction; #14 will poll on it.
- Unknown, malformed and closed rooms all answer the same French 404 "Salle introuvable" (`src/app/rooms/not-found.tsx`). Since #14 a guest who is not a member joins instead (see below).
- `src/proxy.ts` rewrites `/rooms/*` paths with an undecodable segment (for example `/rooms/%`) to the static route `/rooms/unavailable`, which renders the same 404. Next answers 500 for such a dynamic segment, even after a rewrite to another dynamic value.
- No `loading.tsx` or Suspense boundary above the room page: streaming would commit a 200 status before `notFound()` runs, and the 404 status is required. The page loads through `enterRoom` (#14), cached per request so `generateMetadata` and the page share one join.
- A thrown notFound() is client-rendered by Next 16; unmatched URLs are server-rendered. Never add a loading.tsx above rooms/[roomId]: it turns room 404s into 200.
- Copy link: the client builds the address from `window.location`; if the clipboard is refused, the address is shown selected in a read-only field. Confirmation lasts `copyConfirmationSeconds` in `src/config/game.ts`.
- Follow-up: room creation has no rate limit, like guest creation; both belong in the same follow-up.

## Joining and live room updates (#14)

- Join on open (H1, provisional): opening `/rooms/<id>` with a guest session is the join intent. `enterRoom` in `src/app/rooms/[roomId]/load-room.ts` calls `joinRoom` (`src/server/rooms/room-commands.ts`): one transaction that locks the room row (`select … for update`), then answers `not-found` (unknown or closed), `already-member` (any other phase), `race-started` (not `waiting`) or inserts the member with `on conflict do nothing` and bumps the revision. Re-opening never bumps the revision; parallel opens add one row.
- Why a write in a GET is safe here: it is idempotent and unique-backed, the session cookie is SameSite=Lax so a third party can only cause a join through a top-level navigation (the same as opening the link), `frame-ancestors 'none'` blocks framing, and link previews carry no cookie. Rule: never render an in-app `<Link>` to a room page without `prefetch={false}`. The alternative (a POST auto-submitted by the client) loses the no-JavaScript path and adds a round trip.
- Future POST routes (#15+): the proxy Origin/Sec-Fetch-Site guard, the guest from the session only, membership, host and phase checked inside the command, `Content-Type: application/json`, and only the needed methods exported. Every command locks the room row first, in the same order as `joinRoom`, and bumps `revision` through `bumpRevision`.
- A visitor without a guest session: waiting room → `/?room=<id>`; countdown, racing or results → the "La course a déjà commencé" page (200, no name step); unknown or closed → 404. The home page accepts `room` only as one string that passes `parseRoomId`; anything else (arrays, URLs, paths, uppercase) shows no invitation. The entry action re-parses the hidden `returnRoomId` field and rebuilds the target with `roomPath`, so a redirect never leaves the site or a room address.
- Refusal vs 404: a started race is a refusal page with a way back to `/play`, not a 404, because the room exists and the visitor was invited. "Closed" means gone for everyone, members included.
- Snapshot endpoint `GET /api/rooms/<id>/snapshot` (thin route handler): empty 401 for a missing, malformed or expired session before any room lookup; empty 404 for a malformed, unknown, closed or not-a-member room; otherwise the `RoomSnapshot` JSON (`roomId`, `phase`, `revision`, `members` with `memberKey`, `trainerName`, `isHost`, `isViewer`; no guest ids). All answers are `Cache-Control: no-store`. It never joins. Other methods answer 405 (403 from the proxy for a POST without a trusted Origin). The proxy answers an undecodable `/api/rooms/*` path with the same empty 404, because Next answers 400 there.
- Shared view types live in `src/domain/room-view.ts` with `parseRoomSnapshot`, so client code never imports server modules.
- Subscription boundary (`src/features/rooms/live/room-subscription.ts`): `subscribeToRoom(roomId, fromRevision, { onSnapshot, onConnectionChange, onGone, onSessionEnded })` returns an unsubscribe function. It is bound to short polling today (`polling-room-subscription.ts`); push delivery (#18) replaces only the binding. Polling: one request at a time, `waitingPollIntervalMs` 1000 and `requestTimeoutMs` 2500 in `src/config/game.ts`; paused while the tab is hidden and asked again as soon as it is visible or back online; aborts the poller starts itself never report a lost connection. A failure, timeout or server error shows "Connexion perdue. On réessaie…" and retries at the same interval; the next full snapshot resyncs. Only a newer revision redraws the roster. 404 shows "Cette salle n'est plus disponible." and stops; 401 sends the tab to `/?room=<id>`.
- The live roster (`LiveRoomRoster`) sits in an `aria-live="polite"` region, not `role="status"`, which the copy-link confirmation already uses. The page wraps it in a `NextIntlClientProvider` holding only the Room keys it needs.
- CSP unchanged: `connect-src 'self'` covers same-origin polling.
- For #24 (leaving): join on open rejoins on any re-open (Back after leaving, reload, restored tab), so leaving must navigate with `replace` and/or record a "left" marker.
- Follow-ups: rate-limit polling and joins together with guest and room creation; room capacity (#41). Polling costs about one query per second per open waiting-room tab.
- E2E on the dev server: `tests/e2e/support/warm-up.ts` (Playwright `globalSetup`, skipped with `CI`) requests the main routes once so first-compile time does not exceed 5 s expectations.

## Legal notice

PokéType is a non-commercial school project made for educational purposes. It has no ads, payments or revenue. Pokémon and all related names, characters and images are trademarks of Nintendo, Game Freak and The Pokémon Company; PokéType is not affiliated with or endorsed by them. The same notice appears in the README and, in French and English, in the site footer. Sprite sources are recorded in the asset manifest.
