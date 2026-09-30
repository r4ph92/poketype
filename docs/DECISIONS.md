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
- Migration 0000 creates `app_meta`, an empty table that only proves the migration pipeline; #12 drops or replaces it.
- Unit tests: Vitest, files in `tests/unit/`.
- E2E: Playwright (supports several browser contexts, needed for two-guest races), files in `tests/e2e/`. E2E runs against `TEST_DATABASE_URL`, never the development database.
- i18n: next-intl with no locale in the URL; the request locale is French until #20. The footer renders both languages explicitly.
- Message keys and locale are typed: `src/i18n/global.d.ts` augments next-intl from `messages/fr.json`, so a misspelled namespace or key fails `npm run typecheck`.
- Hard-coded visible strings: ESLint `react/jsx-no-literals` (JSX text, string and template children) plus `no-restricted-syntax` for literals, template literals and ternary/logical branches in `alt`, `title`, `placeholder`, `aria-label`. The rule also flags string and template literals as direct branches of a ternary or `&&`/`||` in JSX children. Known gaps: strings held in variables or returned from helpers, strings nested deeper in expressions, and attributes other than those listed. Review still has to catch those.
- `NextIntlClientProvider` is not mounted. When a client component needs messages, wrap only that subtree with just its namespaces, so the catalog is not serialized into every page.
- `agentRules: false` in `next.config.ts` stops `next dev` from writing an agent-rules block into CLAUDE.md.
- Application code is TypeScript only. The only JavaScript files are tool configs: `eslint.config.mjs` and `postcss.config.mjs`.

## Legal notice

PokéType is a non-commercial school project made for educational purposes. It has no ads, payments or revenue. Pokémon and all related names, characters and images are trademarks of Nintendo, Game Freak and The Pokémon Company; PokéType is not affiliated with or endorsed by them. The same notice appears in the README and, in French and English, in the site footer. Sprite sources are recorded in the asset manifest.
