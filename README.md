# PokéType

A school project: real-time multiplayer typing races with a top-down Pokémon world, collectible racers, and evolution through play. Players aged 10–12 practise typing in French and English.

**Status:** early scaffold. A visitor can enter as a guest with a trainer name and reach a play page that remembers them; rooms and races are not built yet.

## Setup

Requires Node 24 (`nvm use` reads `.nvmrc`), npm, and PostgreSQL 18.

1. `npm ci`
2. `cp .env.example .env`.
3. Start PostgreSQL with one of these:
   - Docker: `docker compose up -d`. It creates the `poketype` and `poketype_test` databases with the `.env.example` credentials. It uses port 5432, so stop any local PostgreSQL first.
   - Local PostgreSQL (for example Homebrew): run `createdb poketype` and `createdb poketype_test`, then edit both URLs in `.env` to match your role, for example `postgres://YOUR_USER@localhost:5432/poketype`.
4. `npm run db:migrate` and `npm run db:migrate:test`
5. `npm run dev`, then open http://localhost:3000.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` / `npm run build` / `npm start` | Development server, production build, production server |
| `npm run typecheck` | Strict TypeScript check |
| `npm run lint` | ESLint, including rules that flag hard-coded visible strings (see the limits in `docs/DECISIONS.md`) |
| `npm test` | Vitest unit tests |
| `npm run db:generate` | Generate a migration after editing `src/server/db/schema.ts` |
| `npm run db:migrate` / `npm run db:migrate:test` | Apply migrations to the development / test database |
| `npm run test:e2e` | Playwright tests against the test database (run `db:migrate:test` and, for CI parity, `build` first; set `CI=1` to use `next start`) |

CI (`.github/workflows/ci.yml`) runs the same steps on every pull request against a fresh PostgreSQL.

User-facing text lives in `messages/fr.json` and `messages/en.json`; never write it in a component.

## How work happens

Development runs through Claude Code. `CLAUDE.md` holds the project context; the backlog lives on the GitHub project board as epics and stories with Given/When/Then criteria, groomed from `docs/REQUIREMENTS.md`. Each finished story is one commit.

## Documentation

- [Original school brief](docs/source/cahier-des-charges.docx) and [searchable extraction](docs/source/cahier-des-charges-extracted.md).
- [Requirement checklist](docs/REQUIREMENTS.md), with every requirement ID and school priority.
- [Decisions and open questions](docs/DECISIONS.md).
- [Pokémon progression rules](docs/PROGRESSION.md): XP by place, level table, starters, drops.
- [Visual guide and mockups](docs/design/README.md).
- [Architecture proposal](docs/ARCHITECTURE.md), [milestones](docs/IMPLEMENTATION_PLAN.md) and [acceptance checks](docs/ACCEPTANCE.md).

## Approved direction

Fully retro handheld-game design (the modern-card alternative was rejected). Pokémon race on a shared top-down winding route. Players pick a starter from ten, earn XP by final place, evolve through sustained play, and collect new Pokémon from random post-race drops. Species and evolution never grant typing-speed advantages.

The five mockups are concept references: build real components, text and state, never screenshots.

## Legal notice

PokéType is a non-commercial school project made for educational purposes. It has no ads, payments or revenue. Pokémon and all related names, characters and images are trademarks of Nintendo, Game Freak and The Pokémon Company. This project is not affiliated with or endorsed by them.
