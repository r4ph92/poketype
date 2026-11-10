# Architecture

How PokéType is built, for a reader who has not seen the code. Every diagram below was checked against `main`; when code and diagram disagree, the code wins and the diagram is a bug. Decisions and their history live in [DECISIONS.md](DECISIONS.md); the school brief is summarised in [REQUIREMENTS.md](REQUIREMENTS.md).

Contents: [Stack and layout](#stack-and-layout) · [Data model](#data-model) · [Room and race state machine](#room-and-race-state-machine) · [Real-time flow](#real-time-flow) · [ADR 1: real-time technology](#adr-1-real-time-technology) · [ADR 2: bot management](#adr-2-bot-management) · [Gaps against the assignment](#gaps-against-the-assignment)

## Stack and layout

Next.js App Router, React, strict TypeScript, Tailwind CSS and PostgreSQL (mandated, TECH-1), with Drizzle as the ORM. The app runs on Vercel with a Neon database and a managed Pusher Channels app. Local runs and CI use `docker-compose.yml` (PostgreSQL and Soketi).

| Folder | What lives there |
| --- | --- |
| `src/app/` | Pages and route handlers (`src/app/api/rooms/[roomId]/...` are the room commands). |
| `src/domain/` | Pure functions and types with no I/O: phases, scoring, progress judging, bot typing, XP. |
| `src/server/` | Everything that touches PostgreSQL or Pusher: `rooms/` (commands, snapshot, settlement), `push/`, `trainer/`, `accounts/`, `sessions/`. |
| `src/features/` | Client components and hooks, grouped by feature (`rooms/live/` follows a room, `race/` types and reports). |
| `src/config/game.ts` | Every tuning value (timings, speed caps, capacity, bot levels) in one typed object. |

## Design rules

- The server is authoritative. It owns host identity, membership, settings, the text snapshot, start time, deadline, results and rewards. A client never sends a winner, XP or a drop.
- Every room command runs in one transaction that first locks the room row (`lockRoom`, `SELECT ... FOR UPDATE`), so joins, starts, progress and settlement are serialised per room.
- Every committed change bumps `rooms.revision`. Clients compare revisions to drop stale answers.
- No background job exists. Time-based changes (race deadline, idle lobby close) are applied by the first request that sees them, once, under the room lock.
- Rewards settle exactly once per race participant: the XP, coin, encounter and badge tables have unique keys on the participant, and a refreshed results page reads them.
- Race movement depends only on typing progress; species and evolution give no speed advantage.
