# Local game artwork

- `scenes/`: original vector environment, separate from UI text.
- `sprites/trainers/red.png` and `oak.png`: official trainer artwork obtained from Pokémon Showdown. Render at the native 80×80 size or an integer multiple. Source and rights notes are in `src/assets/manifest.ts`.
- `sprites/pokemon/<species>/`: unmodified PMDCollab Walk and Idle sheets, original `AnimData.xml`, and original `credits.txt` for all 151 Kanto species. Some source actions explicitly alias another action; the importer and generator resolve those references without duplicating or modifying sheets.

`src/assets/pokemon.ts` and `src/assets/sprite-animations.css` are generated from those local files by `python3 scripts/build-sprite-metadata.py`. They retain actual frame dimensions and per-frame duration (1/60 second). Rows are south, southwest, west, northwest, north, northeast, east, southeast. No sprite is stretched or recolored.

Most imported Walk and Idle animations are credited to CHUNSOFT with `Unspecified` terms upstream; action-specific community contributors are preserved in the source credits and named in the generated manifest. Community contributions in SpriteCollab have their own terms, but that does not relicense these official sheets. Pokémon remains third-party IP; the project-wide non-commercial educational notice applies. The in-app `/credits` page includes an expandable 151-species attribution list, naming authors and linking each source.

The old `trainer.svg` and static `charmander.png` are retained as unused prior-review assets. They no longer render in gameplay.

Until persisted starter selection exists, a deterministic mapping from room member key assigns the visual species. Every browser, roster, route, reload and podium uses that same mapping; it is cosmetic, not Pokémon ownership or progression.

During a race, idle sheets are frozen. Only an increase in correct-character progress triggers the short walk cycle and route interpolation. Wrong characters, ignored inputs, unchanged poll responses, and waiting do not trigger motion. Camp, lobby, and podium sprites stay still. Race walk cadence scales with recent correct-character input (including batched remote progress), with a bounded playback rate; only races show motion controls. The credits gallery explicitly previews the available animations.

The trainer dashboard adds the original `scenes/camp.svg` and six original vector badge icons under `badges/`. Unmodified 96×96 front sprites under `sprites/pokemon/front/` come from PokeAPI's Generation V Black/White sprite archive; their source template, IDs, and rights notes are recorded in `dashboardArtwork` in `src/assets/manifest.ts`.

Trainer statistics, recent races, badges, collection, XP and evolution examples live in `src/features/trainer/demo-profile.ts`. PC filtering and inspection work locally; equipping changes the demo partner and campsite, carries across the shared `/play` layout during tab navigation, and resets on reload. Trainer (`/play`), Collection (`/play/collection`), Race (`/play/race`) and Routes (`/play/routes`) are separate pages, using the shared `SiteHeader`/`SiteNav` and `SiteFooter` components. The real race creation action remains connected. The practice dialog is local and grants no XP or rewards. Replace these fixtures and the local equip state when adding persisted trainer progression.

## Saved trainer appearance

`sprites/trainers/overworld/` contains six unmodified 144×32 sheets from `pret/pokeemerald` (official Nintendo / Game Freak / The Pokémon Company artwork). `src/assets/trainers.ts` records the exact upstream paths. Each frame is 16×32; `OverworldTrainer` renders integer-scaled frames and applies the source game's palette-zero transparency rule at runtime. Camp uses a side-facing frame, while the chooser shows front-facing frames.

Signup now redirects to `/choose-trainer`. The allowlisted selection is saved to `users.trainer_avatar` through the current authenticated session and displayed beside the demo buddy at camp. Migration `0008_overjoyed_catseye.sql` adds the nullable appearance column, so older accounts keep the default Red until they choose a trainer. Trainer appearance is persisted; collection/XP and buddy selection remain demo data. The dashboard appearance link lets existing accounts choose or change their sprite.

After confirming a trainer, `/play/choose-starter` offers Bulbasaur, Charmander and Squirtle in shuffled order. This step only equips the matching existing demo Pokémon in the shared client context before navigating to camp. It does not write starter ownership, collection entries, XP, rewards or drops; refreshing still resets the demo buddy. The camp's PC Storage text link has been removed.

## Lobby roster

The waiting-room UI displays live membership in a responsive roster (eight desktop columns, two mobile columns), verified with 32 test participants. Each card opens a keyboard-accessible profile dialog. Saved account trainer appearances are included in room snapshots; guests use Red. Buddy visuals still use the existing deterministic cosmetic assignment shared with races. Level, average WPM, accuracy, races and wins are explicitly labelled demo examples. No collection ownership or profile-stat backend is implied.

The invitation panel displays the full existing room UUID and the working copy-invite-link control. No short-code lookup service or new capacity limit was introduced. The 32-player test checks roster rendering and starting a race, not sustained multiplayer load capacity.


## 151-species catalog and achievement preview

- `/play/pokedex`: paginated searchable Kanto catalog, ownership/evolution/legendary filters, source-backed evolution predecessors, and opt-in race animation previews. All species have native front artwork plus directional idle and walk metadata, including evolved forms and five legendary/mythical species.
- `/play/achievements`: eight proposed badge milestones and five legendary goals in `src/config/achievements.ts`. Progress is explicitly sample data. No rewards, ownership, achievements or badges are persisted or granted yet.
- `scripts/data/kanto.json`: localized names and Kanto evolution predecessors from PokeAPI CSVs. Species #001–#151 only; predecessors outside Kanto are omitted.
- `python3 scripts/import-kanto-sprites.py` imports unmodified sheets and front artwork. `python3 scripts/build-sprite-metadata.py` validates dimensions, frame timing and attribution, handles `CopyOf`, and rebuilds TypeScript/CSS/catalog names.
- `scripts/data/sprite-credit-names.txt` resolves upstream contributor IDs. Original per-species credits and `SOURCE-LICENSE.md` remain available locally. Community asset terms do not relicense official game artwork.
