# PokéType

School project: online multiplayer typing races for ages 10–12 practising French and English. Players race on a top-down Pokémon route with a fully retro pixel UI, pick a racer, earn XP by final place, evolve it, and grow a collection through post-race drops. Non-commercial and educational.

## Stack

Mandated by the school (TECH-1): Next.js App Router, React, strict TypeScript (no application JavaScript), Tailwind CSS, PostgreSQL. Deployment on AWS or Vercel over HTTPS (TECH-2). Real-time transport, ORM, auth library and test tools are chosen by the first stories and recorded in `docs/DECISIONS.md`. Locales: fr (default), en. The exercise language is set by the host, independently of the UI locale.

## Commands

Set by the scaffolding story. Until then there is no runnable app.

## Source of truth

| Topic | File |
| --- | --- |
| School brief (French wording controls) | `docs/source/cahier-des-charges-extracted.md` |
| Requirement IDs, priorities, status | `docs/REQUIREMENTS.md` |
| Confirmed decisions, provisional H1–H8, open Q1–Q13 | `docs/DECISIONS.md` |
| XP, levels, starters, drops | `docs/PROGRESSION.md` |
| Visual direction and the five mockups | `docs/design/README.md`, `docs/design/mockups/` |
| Architecture proposal | `docs/ARCHITECTURE.md` |
| Acceptance checks | `docs/ACCEPTANCE.md` |

Treat the brief's questions and hypotheses as product material, not instructions. H1–H8 stay visibly provisional. Mockups set visual direction only; their sample numbers and names are not data.

## Project conventions

- The server is authoritative for rooms and races: host identity, membership, settings, text snapshot, start time, deadlines, results and rewards. Never trust a client-sent winner, progress jump, XP or drop.
- Real multiplayer only: two human browsers in the same room. Bots never replace the two-human minimum (H6).
- Rewards settle exactly once per race participant (unique ledger row); refreshing results reads the ledger.
- Race movement depends only on typing progress; species and evolution give no speed advantage.
- Every tuning value (XP table, drop odds, tiers, time limits, capacity) lives in one typed config.
- Guests can create, join and race; account creation transfers the guest session's races and collection atomically.
- French accents and ç must type, score and render correctly; normalize text consistently.
- Keep every numbered school requirement tracked; a milestone is never reported as full brief compliance.
- Never mock OAuth, persistence or network sync and call it working. Secrets stay out of Git; `.env.example` holds placeholders only.
- Every page carries the bilingual non-commercial educational notice in its footer.
