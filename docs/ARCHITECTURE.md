# Architecture proposal

This is an implementation recommendation. The source mandates the stack, but not these libraries or deployment topology. Verify current official documentation and free-tier availability when implementing; no package versions or hosting-plan claims are pre-validated in this handoff.

## Required stack and suggested structure

Next.js App Router with React and strict TypeScript, Tailwind CSS, PostgreSQL with typed migrations through Prisma or Drizzle (choose one). Use a maintained authentication solution supporting username/password plus GitHub and Discord OAuth. Hash local passwords with a maintained password-hashing implementation; use secure server-managed sessions. Never trust browser player IDs as authorization.

Suggested directories: `src/app/` routes, `src/components/pixel/`, `src/features/{auth,rooms,race,collection,stats}/`, `src/server/`, `src/domain/` pure scoring/text/progression functions, `src/i18n/`, `server/` if a real-time process is required, `tests/`, `public/assets/`, and `docs/`. Application source is TypeScript. Keep this readable for a school presentation.

## Real-time transport and hosting decision

Chosen in #18: the Next.js app on Vercel plus a managed Pusher Channels app (Pusher protocol). No real-time process lives in the project; Vercel functions never hold a socket.

- Commands stay plain route handlers that commit in PostgreSQL. After the commit, the handler publishes a `revision` ping on the room's private channel through `after()`; the ping holds only the revision number.
- Browsers subscribe to `private-room-<roomId>` after `POST /api/rooms/<id>/channel-auth` signs the subscription for a member of that room. Client events are disabled, so only the server publishes.
- On a ping, each member refetches its own snapshot from `GET /api/rooms/<id>/snapshot`, so authorization and the per-viewer view stay in one place. Polling continues as a 1 s keepalive and takes over at the #14/#16 pace when the socket is down or misses a change.
- Local development and CI run Soketi (a Pusher-protocol server) from `docker-compose.yml`; production needs only the `PUSHER_*` variables. Details and alternatives: DECISIONS.md, "Live updates by push (#18)".

## State and protocol

Room lifecycle: WAITING → COUNTDOWN → RACING → RESULTS → WAITING, with CLOSED reachable through host closure and defined timeout paths. Server owns host identity, membership, settings, generated text snapshot, scheduled start timestamp, deadlines, finish state and reward settlement.

Commands include create/join/leave room, create/redeem invite, update settings, update ready, start race, submit input/progress, abandon, reconnect, return to preparation and close room. Validate permissions, room phase and payloads at every command. Broadcast revisioned room/race snapshots or ordered events. Authenticate real-time connections, sequence input events, acknowledge progress and resynchronize on reconnect. Matchmaking admission and one-time invite redemption must be atomic.

Clients render countdown from a server timestamp, not unrelated local timers. Handle late messages and clock skew. Throttle opponent broadcasts while local typing remains immediate. Validate progress against the text and elapsed time; never accept a client-provided winner, XP count or drop result. Do not claim perfect anti-cheat, but prevent trivial impossible progress and replayed commands.

Store normalized text consistently; support accent composition and avoid scoring intermediate IME events as errors. Decide grapheme accounting, backspace, paste and correction semantics explicitly. Persist event/counter data sufficient to compute accurate penalties and heatmaps. Server recomputes final metrics. Tests should pin down this contract.

## Suggested data model

- User, provider identity, password credential, session and guest session.
- Room, membership, room settings, hashed single-use invitation token with redemption state.
- Race with immutable exercise/settings snapshot, timestamps, termination reason and mode.
- RaceParticipant with user/guest reference, selected Pokémon instance snapshot, input counters, progress, score, accuracy, status and finish time.
- Per-key aggregates or compact input telemetry suitable for heatmaps; avoid retaining unrelated keyboard activity.
- Species with evolution rules and sprite references; OwnedPokemon with owner, form, level/XP and provenance; active racer selection.
- RewardLedger keyed uniquely by race participant, including XP and drop outcome; badge/milestone data if implemented.

Use transactions/unique constraints for guest-to-new-account transfer, invite use and reward settlement. Never overwrite historical participant species when an owned Pokémon evolves later. Session owners must only read/mutate their own private stats and collection. Room viewers receive only needed participant data.

## Scoring and rewards

Implement H3 in pure tested functions. Distinguish passage completion, gross WPM, corrected score, accuracy and final rank. Persist formula/rules version with each race. Timeouts use the defined deadline; handle ties and withdrawals as source specifies. Group/filter records by comparable settings.

Award Pokémon XP and drops exactly once after authoritative settlement. Use server-side random draws; inject a deterministic RNG in tests. Keep probabilities, eligibility, XP curve, roster and duplicate policy in configuration. A refreshed results page reads the existing ledger. Evolution validates eligibility and ownership atomically.

## Testing and developer workflow

Suggested tools: a compatible unit runner, React component testing where behavior warrants it, and Playwright E2E with at least two isolated contexts. Choose versions at setup. CI provisions PostgreSQL, migrates/seeds it, starts required servers, runs unit and E2E checks, and preserves failure artifacts. Include typecheck, lint and production build commands. OAuth integration needs real provider setup; unit-test boundaries and document any manual verification without treating mocks as live proof.

Write an `.env.example` listing only chosen stack variables with fake placeholders. Document ports, database creation/migrations, seed accounts, local OAuth callbacks, startup, tests, production topology and HTTPS. Do not guess runnable commands before the application exists.
