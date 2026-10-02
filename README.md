# PokéType

A school project: real-time multiplayer typing races with a top-down Pokémon world, collectible racers, and evolution through play. Players aged 10–12 practise typing in French and English.

**Status:** early scaffold. A visitor can enter as a guest with a trainer name and reach a play page that remembers them, create an account with a username and a password, create a waiting room with its own address, and invite a friend who joins from the link; rooms and races update live by push (Pusher protocol), with polling as a fallback. The host starts the race, and both players type the passage while seeing each other's progress live. Logging in again, results and rewards are not built yet.

## Setup

Requires Node 24 (`nvm use` reads `.nvmrc`), npm, and PostgreSQL 18.

1. `npm ci`
2. `cp .env.example .env`.
3. Start PostgreSQL with one of these:
   - Docker: `docker compose up -d`. It creates the `poketype` and `poketype_test` databases with the `.env.example` credentials and starts Soketi (below). It uses port 5432, so stop any local PostgreSQL first.
   - Local PostgreSQL (for example Homebrew): run `createdb poketype` and `createdb poketype_test`, then edit both URLs in `.env` to match your role, for example `postgres://YOUR_USER@localhost:5432/poketype`.
4. Start Soketi, the local push server: `docker compose up -d soketi` (port 6001). It reads the `PUSHER_*` values from `.env`. Without it the app still works by polling, but the push e2e specs fail, and CI refuses to run without `PUSHER_*`. To run without push, remove every `PUSHER_*` line from `.env`; setting only some of them fails the build.
5. `npm run db:migrate` and `npm run db:migrate:test`
6. Optional: `npm run db:seed` creates the demo accounts Maya and Leo (each with a starter; test passwords in `scripts/seed-accounts.ts`) and, when `SEED_ASH_PASSWORD` is set in `.env`, the test account `ash` with all 151 Pokémon at level 99 and all eight badges. The seed is safe to run again.
7. `npm run dev`, then open http://localhost:3000.

### Test account `ash` in production

`ash` is a normal account holding every Pokémon and badge, for demonstrations. To create it in the deployed database, set `SEED_ASH_PASSWORD` (8 to 128 characters) in Vercel and run the seed once against the production URL: `DATABASE_URL=<production url> SEED_ASH_PASSWORD=<password> npm run db:seed`. Against a remote database the seed creates only ash, never Maya or Leo. Keep the password out of Git.

### Production push service

The deployed app needs a Pusher Channels app; nothing in the repository creates it.

1. Create a free Pusher account and a Channels app (Sandbox plan) in the cluster nearest the database, for example `eu`. Leave client events disabled (the default).
2. In the Vercel project, set `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET` and `PUSHER_CLUSTER` for Production and Preview, then redeploy: the CSP is built from them. Do not set `PUSHER_HOST`, `PUSHER_PORT` or `PUSHER_USE_TLS` there.
3. Keep the secret out of Git; `.env.example` holds placeholders only.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` / `npm run build` / `npm start` | Development server, production build, production server |
| `npm run typecheck` | Strict TypeScript check |
| `npm run lint` | ESLint, including rules that flag hard-coded visible strings (see the limits in `docs/DECISIONS.md`) |
| `npm test` | Vitest unit tests |
| `npm run db:generate` | Generate a migration after editing `src/server/db/schema.ts` |
| `npm run db:migrate` / `npm run db:migrate:test` | Apply migrations to the development / test database |
| `npm run db:seed` / `npm run db:seed:test` | Create the demo accounts Maya and Leo if missing (local databases only unless `SEED_ACCOUNTS=allow`) and `ash` when `SEED_ASH_PASSWORD` is set; the e2e run seeds the test database itself |
| `npm run test:e2e` | Playwright tests against the test database (run `db:migrate:test` and, for CI parity, `build` first; set `CI=1` to use `next start`; `E2E_PORT` sets the app port, default 3100; the outage and push-fallback tests start extra servers on the next ports; Soketi must be running) |

CI (`.github/workflows/ci.yml`) runs the same steps on every pull request against a fresh PostgreSQL and Soketi.

User-facing text lives in `messages/fr.json` and `messages/en.json`; never write it in a component.

Pages that share the site header live in the `src/app/(site)/` route group (the folder name does not appear in URLs); its layout renders the skip link and header. Build screens from the retro component kit in `src/components/pixel/` and the tokens in `src/app/globals.css`; the rules are in [docs/design.md](docs/design.md).

## How work happens

Development runs through Claude Code. `CLAUDE.md` holds the project context; the backlog lives on the GitHub project board as epics and stories with Given/When/Then criteria, groomed from `docs/REQUIREMENTS.md`. Each finished story is one commit.

## Documentation

- [Original school brief](docs/source/cahier-des-charges.docx) and [searchable extraction](docs/source/cahier-des-charges-extracted.md).
- [Requirement checklist](docs/REQUIREMENTS.md), with every requirement ID and school priority.
- [Decisions and open questions](docs/DECISIONS.md).
- [French accents and keyboards](docs/keyboards.md): Unicode form, dead keys and the tested keyboards.
- [Pokémon progression rules](docs/PROGRESSION.md): XP by place, level table, starters, drops.
- [Visual guide and mockups](docs/design/README.md).
- [Architecture proposal](docs/ARCHITECTURE.md), [milestones](docs/IMPLEMENTATION_PLAN.md) and [acceptance checks](docs/ACCEPTANCE.md).

## Approved direction

Fully retro handheld-game design (the modern-card alternative was rejected). Pokémon race on a shared top-down winding route. Players pick a starter from ten, earn XP by final place, evolve through sustained play, and collect new Pokémon from random post-race drops. Species and evolution never grant typing-speed advantages.

The five mockups are concept references: build real components, text and state, never screenshots.

## Legal notice

PokéType is a non-commercial school project made for educational purposes. It has no ads, payments or revenue. Pokémon and all related names, characters and images are trademarks of Nintendo, Game Freak and The Pokémon Company. This project is not affiliated with or endorsed by them.
