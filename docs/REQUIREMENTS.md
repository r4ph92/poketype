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
| TXT-1 | Essential | Host customizes French/English text independently of each user's UI language; identical initial text for all. |
| TXT-2 | Essential | Sentences or shuffled words; host selects word count and multiple repeatedly practiced characters, including accents/ç. |
| TXT-3 | Essential | Support capitals, symbols, digits; personalization frequencies remain to be specified. |
| JEU-1 | Essential | Shared start, live progress and ranking, discreet overtake/overtaken feedback. |
| JEU-2 | Essential | Free-entry errors marked red at finish with ranking penalties; blocked-entry incorrect character must be corrected with small per-error penalty. |
| JEU-3 | Essential | Maximum race duration; end when all finish or timeout; explicit abandoned/disconnected outcomes. |
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
