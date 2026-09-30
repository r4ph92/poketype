# Acceptance checks

These checks are a review plan; none have been executed against an application in this handoff.

## Core end-to-end scenarios

- Two independent browser contexts enter as guests. One creates a public room; the other's main race button selects the fullest eligible waiting room. One human plus bots does not bypass provisional H6.
- Only host can change settings/start/close. Closed-room token works once; a public code cannot bypass closed-room authorization. Concurrent matchmaking/invite requests remain consistent.
- Host chooses French exercise with accents and ç, chosen length/characters, then English independently of UI locale. Impossible character repetition requirements are rejected before countdown.
- Both players get the same text and scheduled start. Opponent progress/ranking updates in real time; intermediate text composition is handled correctly.
- Free and blocked modes produce their documented errors, gross WPM, corrected scores and ties. Completion is not assumed to be final rank. Invalid client progress is rejected.
- Maximum duration, all-finished, inactivity and all-disconnected conditions terminate according to H4. Reconnect resumes state without pausing clock. Abandon becomes spectator and does not block remaining racers. Leave and close are separate actions.
- Results show every participant, podium where possible, score/accuracy/errors and final statuses. Rematch retains room/group and host can alter settings.
- New account creation moves the current guest session's results and proposed Pokémon progress exactly once. History persists across login/restart and is inaccessible to another user.
- GitHub and Discord auth follow configured real callbacks. Missing credentials are clearly documented and do not break guest/local login workflows.
- Selecting Pokémon persists; race start freezes selected instance for rewards. Completion settles XP/drop once. Refresh, reconnect and duplicate settlement requests cannot duplicate rewards. Evolution checks eligibility and preserves history.

## Statistics and visual checks

- Trend/history indicate language, error mode and bonus state. Classic personal records exclude bonus races. Heatmap has documented keyboard layout and error-count semantics.
- All five reference screens are recognizable in implemented UI: cream pixel panels, consistent navy stepped borders, pixel scenes/sprites, calm readable typing region. No whole-screen screenshot masquerading as interface.
- Verify empty/loading/error states, all three room visibility UIs, long names, 2/4/more-than-4 participants, ties, no drop, duplicate and evolution states.
- At desktop race sizes no typing panel clipping; non-race screens reflow on phone and tablet. Dark mode remains coherent and legible. French accents render. Keyboard focus and reduced motion work.
- Mockup numerical contradictions are corrected by actual state: XP fill/labels agree, selected level/evolution labels agree, participant species persist, placement has clear scoring semantics.

## Delivery evidence

Record exact commands and outcomes for lint, TypeScript, meaningful unit/integration tests, multi-context E2E and production build. CI runs unit and E2E automatically. Link screenshot evidence and requirement status. Document actual tested setup and chosen deployment topology, asset provenance, configured capacity and outstanding decisions. Do not label a mocked or unconfigured external integration verified.
