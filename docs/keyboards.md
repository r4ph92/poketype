# French accents and keyboards

How the race turns what a keyboard sends into typed characters (#22, TXT-2, H3). Code: `src/domain/typing-progress.ts`, `src/features/race/use-typing-field-events.ts`, `src/features/race/composition-guard.ts`.

## One Unicode form

- Passages are stored and compared in NFC (`pickPassage`, the `races.passage` copy).
- Everything a player types is normalized to NFC before it is judged, so `é` sent as one code point or as `e` + U+0301 in the same event is the same character.
- Characters are counted by code point on the client and the server (`passageCharacters`, `passageLength`). An accented letter is one character for progress, WPM and accuracy.
- "Decomposed" means inside one event. A plain `e` followed by a separate U+0301 event is a wrong `e`, then an ignored accent: the passage never changes an earlier character.

## What counts as one keystroke

| Input | Result |
| --- | --- |
| `insertText` with one character (after NFC) | Judged: correct or rejected |
| Committed composition (`compositionend` data) with one character | Judged once |
| A lone accent: `´` `` ` `` `^` `¨` or a combining mark (Unicode `Sk`, `Mn`) | Ignored, never an error |
| Accent then a letter it cannot combine with (`´z`, `^e`) | The accent is dropped, only the letter is judged |
| Text while a composition is open (`insertCompositionText`, any `isComposing` event) | Ignored |
| Paste, drop, autocorrect, several characters at once, deletions, line breaks | Ignored |

The server sees only counters and still checks `keystrokes − rejected = position`; nothing changed there.

## Composition in the typing area

The textarea is uncontrolled: React restores a controlled value on every `input` event, which cancels an open composition. Plain edits are still cancelled in `beforeinput` and described to the race.

1. `compositionstart` opens the composition. The dead key's accent stays visible in the field.
2. Every `beforeinput` and `input` while it is open is ignored.
3. `compositionend` is the only commit that counts; its data goes through the rules above.
4. The composition closes one macrotask later, then the field is emptied. Safari inserts the committed text again right after `compositionend`; that insertion falls inside the open window, so it is never counted twice.

## Keyboards

"Simulated" means a Playwright test in Chromium drives the event sequence; it is not a physical keyboard. No row has been checked by hand yet.

| Keyboard and method | What the browser sends | Automated (`tests/e2e/french-accents.spec.ts`) | Manual check |
| --- | --- | --- | --- |
| Canadian French, dedicated keys (é è à ù ç) | one `insertText` | Simulated (Playwright `keyboard.type`) | Not yet checked |
| Canadian French, dead `^` then e | composition `^` then commit `ê` | Simulated through Chromium's IME layer (CDP `Input.imeSetComposition` + `Input.insertText`) | Not yet checked |
| French AZERTY, dedicated keys (é è à ù ç) | one `insertText` | Simulated (Playwright `keyboard.type`) | Not yet checked |
| French AZERTY, dead `^` then e | composition `^` then commit `ê` (or one `insertText` on Windows) | Simulated through Chromium's IME layer | Not yet checked |
| US-International, dead `´` `` ` `` `^` then a letter | composition then commit | Simulated through Chromium's IME layer, whole passage | Not yet checked |
| macOS Option combination (Option-e then e) | composition `´` then commit `é` | Simulated through Chromium's IME layer | Not yet checked |
| Decomposed output (`e` + U+0301 in one event) | one `insertText` or one commit | Simulated (`keyboard.insertText`, CDP commit) | Not yet checked |
| Safari order (commit inserted again after `compositionend`) | `compositionend` then `insertFromComposition` / `insertText` | Dispatched by hand in Chromium; Playwright WebKit is not run | Not yet checked |

Known limitations:

- macOS press-and-hold (hold e, pick é from the popup) is not supported: the held `e` is judged as soon as it is typed, and the accent picked afterwards replaces text instead of typing a new letter. Use a dead key or the Option combination.
- US-International `'` and `"` are dead keys. `'` then a letter it cannot combine with usually commits both characters at once, which is ignored as several characters at once; type `'` then space for a plain apostrophe.
- Firefox and Safari event orders are covered by the rules above but not run in CI (Chromium only).

## Passages

`src/config/passages.ts` uses lowercase `é è à ù ç ê`, straight apostrophes, spaces, commas and periods. No accented capitals and no `œ`, which are hard to find for ages 10–12; `œ` still counts when typed. A unit test refuses any lone accent or combining mark in a passage.
