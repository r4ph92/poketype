# Requirements and traceability

Source: `source/cahier-des-charges.docx`. The French source wording controls interpretation; summaries below are an implementation checklist. The product serves ages 10–12 practicing French and English typing. Accuracy must influence results. All unchecked boxes mean not yet implemented in this handoff.

## School requirements

| ID | Priority in source | Required behavior |
| --- | --- | --- |
| AUTH-1 | Essential | GitHub and Discord login, plus unique username/password login; no email requirement or password recovery feature. |
| AUTH-2 | Desirable / lower | Provider-imported or uploaded profile photo (desirable); remember-me option (lower). |
| AUTH-3 | Essential | Guests can use game features, create/join races, and see race/session stats. |
| AUTH-4 | Essential | Attach guest-session races when creating a new account; retain complete account race history/statistics. |
| SAL-1 | Essential | Listed public rooms, unlisted code rooms, closed rooms entered through unique host-generated invitation links. |
| SAL-2 | Essential | Home race action chooses fullest eligible public room; create a room if none qualifies. |
| SAL-3 | Essential | Waiting room; host starts; at least two people. No requested product maximum; technical capacity must be validated. |
| SAL-4 | Essential / lower | Same group can prepare another race with changed settings; host can close room and return everyone home. Host transfer is lower priority. |
| STAT-1 | In progress: every racer's place, WPM, corrected score, accuracy, errors and finish time, settled by the server under H3 (#17); podium, ties display and final statuses not built (#30) | `tests/unit/race-results.test.ts`, `tests/e2e/settle-race-command.spec.ts`, `tests/e2e/race-results.spec.ts`, `tests/e2e/progress-attacks.spec.ts` |
| TECH-3 | In progress: unit and E2E suites run in CI, including the full two-browser race through the interface (#17); deployment documentation not complete | `.github/workflows/ci.yml`, `tests/e2e/full-race.spec.ts` |
| TXT-1 | Essential | Host customizes French/English text independently of each user's UI language; identical initial text for all. |
| TXT-2 | Essential | Sentences or shuffled words; host selects word count and multiple repeatedly practiced characters, including accents/ç. |
| TXT-3 | Essential | Support capitals, symbols, digits; personalization frequencies remain to be specified. |
| JEU-1 | Essential | Shared start, live progress and ranking, discreet overtake/overtaken feedback. |
| JEU-2 | Essential | Free-entry errors marked red at finish with ranking penalties; blocked-entry incorrect character must be corrected with small per-error penalty. |
| JEU-3 | In progress: every race ends at its 180 s limit (H4 provisional default) or when everyone finishes, settled once by the server; unfinished racers are shown "Non terminé" and ranked by score (#23). Host-chosen duration (#33) and disconnected outcomes (#27) not built; abandoned racers are listed "Abandon" without a place (#25) | `tests/e2e/time-limit-command.spec.ts`, `tests/e2e/race-time-limit.spec.ts`, `tests/unit/race-remaining.test.ts` |
| JEU-4 | Essential | Reconnection, inactivity ending, all-disconnected safety deadline, no indefinitely blocked races. |
| JEU-5 | Essential | Abandon and remain spectator; separate leave-room action. |
| JEU-6 | Desirable | Multiple bot levels with different WPM and realistic nonzero errors. |
| JEU-7 | Lower | Catch-up bonuses: add words to leaders, remove words for trailing players, blur leaders' text; triggers/limits undecided. |
| STAT-1 | Essential | Everyone's results, top-three podium when possible, WPM, accuracy, errors, final result. |
| STAT-2 | Essential | Complete account history and WPM trend; distinguish settings affecting comparability. |
| STAT-3 | Desirable / lower | Per-key error-rate keyboard heatmap (desirable); milestones/rewards/notifications (lower). |
| UX-1 | Essential | Original, consistent, lively art direction suitable for ages 10–12 and typing practice. |
| UX-2 | Essential | Light and dark themes; responsive non-race pages. Race targets physical-keyboard desktop under H8. |
| TECH-1 | Essential | React, Next.js, TypeScript application code, Tailwind CSS, PostgreSQL. |
| TECH-2 | Essential | AWS or Vercel deployment, HTTPS, free real-time service or self-implemented real-time mechanism. |
| TECH-3 | Essential | GitHub code, installation/configuration/test/deploy documentation; automated unit and E2E tests in pipeline. |

## User-selected creative scope

- [ ] POKE-1: On first entry each player picks a starter from a pool of ten; afterwards they select any owned Pokémon as racer.
- [ ] POKE-2: Races grant the selected racer XP by final place; fixed per-level XP costs; reaching a species' level unlocks evolution.
- [ ] POKE-3: Random post-race drops from every catchable Kanto base-form species, by rarity tier, expand the collection.
- [ ] POKE-4: Top-down Pokémon race world and fully retro pixel UI matching the approved first concept.
- [ ] POKE-5: Trainer stats dashboard, visible partner XP/evolution, collection details, shared lobby, results/rewards screens.
- [ ] POKE-6: README and a bilingual site footer state PokéType is a non-commercial educational project and credit the Pokémon rights holders.

Numbers and pools are in [PROGRESSION.md](PROGRESSION.md). The school ranks generic rewards lower; the user has made Pokémon progression a central creative feature. Build it after reliable core racing and before optional bonuses. Do not sacrifice essential school features for collection breadth.

## Completion tracking

On implementation, add a status and evidence link per ID: Not started / In progress / Implemented / Verified / Blocked. Link relevant tests or screenshots. Preserve AUTH-2, SAL-4 and STAT-3 subfeature priorities. A completed milestone is not equivalent to full brief compliance.

| ID | Status | Evidence |
| --- | --- | --- |
| SAL-3 | In progress: host-only start with a two-person minimum (#15); capacity not validated | `tests/e2e/start-race.spec.ts`, `tests/e2e/start-race-attacks.spec.ts`, `tests/e2e/start-race-command.spec.ts` |
| JEU-5 | In progress: abandon keeps the racer watching with live progress, never delays the end (H4), is listed "Abandon" without a place, and a separate leave-room action exists (#24, #25); spectator reconnection and inactivity outcomes (#27) not built | `tests/e2e/leave-abandon-command.spec.ts`, `tests/e2e/leave-abandon.spec.ts`, `tests/e2e/leave-abandon-attacks.spec.ts` |
| SAL-4 | In progress: the host can close the room and everyone else returns home with a notice (#24); preparing another race with changed settings (#42) and host transfer (#76) not built | `tests/e2e/leave-abandon-command.spec.ts`, `tests/e2e/leave-abandon.spec.ts` |
| JEU-1 | In progress: shared start (#15), live progress within 1 s (#16) and the final ranking (#17); live ranking and overtake feedback not built | `tests/e2e/start-race.spec.ts` (clock skew), `tests/unit/server-clock.test.ts`, `tests/e2e/type-passage.spec.ts`, `tests/e2e/progress-attacks.spec.ts`, `tests/unit/race-results.test.ts` |
| JEU-2 | In progress: blocked entry built without penalties (#16), accents and dead keys judged as one character (#22); free entry (#32) and ranking penalties not built | `tests/unit/typing-progress.test.ts`, `tests/e2e/type-passage.spec.ts`, `tests/e2e/french-accents.spec.ts` |
| TXT-2 | In progress: accents and ç type, score and render correctly, built-in passages include é è à ù ç ê (#22; keyboards simulated in Chromium, none checked by hand, see `docs/keyboards.md`); word count, shuffled words and practised characters not built (#31, #35) | `tests/unit/typing-progress.test.ts`, `tests/unit/composition-guard.test.ts`, `tests/unit/passages.test.ts`, `tests/e2e/french-accents.spec.ts` |
| TXT-1 | In progress: identical initial text for all (#15); host text settings not built (#31) | `tests/e2e/start-race.spec.ts` (same passage) |
