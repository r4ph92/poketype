# Bots

A bot is a computer racer the host adds in the lobby (BOT-01 to BOT-05). It never sends anything: every race view and the server compute where it is from the same pure function, so nothing runs in the background and a refresh never moves it.

## Levels

The five levels of the brief, with their tuning in `gameConfig.bots.levels` (`src/config/game.ts`):

| Level (fr / en) | Key | Net WPM range | Target | Error rate |
| --- | --- | --- | --- | --- |
| Noob / Noob | `noob` | 10–20 | 14 | 12 % |
| Débutant / Beginner | `novice` | 20–35 | 25 | 8 % |
| Intermédiaire / Intermediate | `intermediate` | 35–60 | 46 | 5 % |
| Expert / Expert | `expert` | 70–100 | 75 | 2 % |
| Impossible / Impossible | `impossible` | 140+ | 165 | 0.5 % |

Net WPM is the Annex A speed used for players: correct characters ÷ 5 ÷ minutes. The target is a calibration value, not a promise: on real race texts the averages land a few WPM above it, inside the range (`tests/unit/bot-race.test.ts` checks 20 seeded races per level in both error modes). Every place a bot appears labels it "Bot · <level>" (`useBotLabel`, `src/features/rooms/bots/bot-label.ts`).

Each level has its own trainers (`src/assets/bot-characters.ts`). Migration 0041 moved the old levels to the new ones at the same rank: beginner → noob, easy → novice, medium → intermediate, hard → expert, expert → impossible.

## How a bot types

`botKeystrokes` (`src/domain/bot-typist.ts`) yields every keystroke of a race, each with its counters and its time from the start. Every draw comes from a mulberry32 generator seeded by the race's bot seed, in a fixed order, so the same level, seed, text and error mode always type the same race (BOT-05).

- **Pace**: one factor per race (± 6 %) and one per keystroke (± 25 %).
- **Bursts and slow stretches**: they alternate, each lasting 4 to 6 seconds, and speed the bot up or slow it down by 35 to 45 %. They are measured in time, not words, so a fast bot varies over 5-second windows as much as a slow one (over 15 % on the default and 10-word texts, checked on 40 seeds per level and mode). Over time they average out to the level's speed.
- **Hesitations**: in a slow stretch, before 30 % of words, it pauses for 3 to 8 keystrokes' time; a burst flows without one.
- **Long words**: a word of 8 letters or more (letters only, so `l'arbre,` is 6) is typed 1.4 times slower per character.
- **Mistakes**: each keystroke is wrong with the level's error rate. In "Correction obligatoire" the cursor stays and the bot spends 1 to 3 keystrokes' time fixing it before the right key. In "Libre" it moves on; the mistake stays in the text, counts as an error, and is left out of its correct characters.

The keystroke time is set so the level averages its target on a typical text (`calibration`: 6 characters per word, 20 % of characters in long words), with every pause and correction counted. A catch-up bonus removes words from the end of a bot's text; a shorter text is a prefix, so the bot types it exactly like the start of the full one and never jumps back.

## Where it is used

- `botProgressAt` (`src/domain/bot-race.ts`): the position and counters at a moment. The race view (`src/features/race/bot-racers.ts`), the snapshot (`src/server/rooms/bot-views.ts`), the catch-up bonuses and the settlement (`src/server/rooms/settle-bots.ts`) all call it with the bot's own text from `botCourseIn` (`src/server/rooms/bot-course.ts`).
- `botCorrectCharactersBySample`: the WPM chart after the race (#147).
- Bots never earn rewards and never decide anything; the server settles them like players at the race end.
