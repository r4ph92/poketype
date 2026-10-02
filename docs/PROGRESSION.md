# Pokémon progression rules

Decided by the product owner on 2026-09-30. All values live in one typed configuration file so they can be tuned without code changes. Species and evolution never change race speed: position comes only from typing.

## Race XP by result

XP goes to the Pokémon selected as racer when the race started. The server grants it once, after the race is settled.

| Race result | XP |
| --- | --- |
| 1st place | 150 |
| 2nd place | 120 |
| 3rd place | 100 |
| 4th place and below, finished | 80 |
| Not finished at the time limit | 40 |
| Abandoned, or disconnected at the end | 0 |

Tied players share the better place and its XP. Place is the final H3 ranking (corrected score), not arrival order; an unfinished result earns 40 whatever its rank. A race counts for XP only when at least two humans started it.

## Levels

Every Pokémon starts at level 5 with 0 XP and caps at level 50. XP to reach the next level is `50 + 10 × current level`. One race can raise several levels; XP beyond level 50 is not stored.

| Level | XP to next level | Total XP to reach this level |
| --- | --- | --- |
| 5 | 100 | 0 |
| 6 | 110 | 100 |
| 7 | 120 | 210 |
| 8 | 130 | 330 |
| 9 | 140 | 460 |
| 10 | 150 | 600 |
| 11 | 160 | 750 |
| 12 | 170 | 910 |
| 13 | 180 | 1080 |
| 14 | 190 | 1260 |
| 15 | 200 | 1450 |
| 16 | 210 | 1650 |
| 17 | 220 | 1860 |
| 18 | 230 | 2080 |
| 19 | 240 | 2310 |
| 20 | 250 | 2550 |
| 21 | 260 | 2800 |
| 22 | 270 | 3060 |
| 23 | 280 | 3330 |
| 24 | 290 | 3610 |
| 25 | 300 | 3900 |
| 26 | 310 | 4200 |
| 27 | 320 | 4510 |
| 28 | 330 | 4830 |
| 29 | 340 | 5160 |
| 30 | 350 | 5500 |
| 31 | 360 | 5850 |
| 32 | 370 | 6210 |
| 33 | 380 | 6580 |
| 34 | 390 | 6960 |
| 35 | 400 | 7350 |
| 36 | 410 | 7750 |
| 37 | 420 | 8160 |
| 38 | 430 | 8580 |
| 39 | 440 | 9010 |
| 40 | 450 | 9450 |
| 41 | 460 | 9900 |
| 42 | 470 | 10360 |
| 43 | 480 | 10830 |
| 44 | 490 | 11310 |
| 45 | 500 | 11800 |
| 46 | 510 | 12300 |
| 47 | 520 | 12810 |
| 48 | 530 | 13330 |
| 49 | 540 | 13860 |
| 50 | max level | 14400 |

At about 110 XP per race, a starter reaches level 16 in about 15 races and level 36 in about 70.

## Evolution

Each species has its own evolution level in species data. Once a Pokémon reaches it, the collection shows an EVOLVE action; the player confirms and the Pokémon evolves with a celebration. Players can keep the current form. All evolutions in PokéType are level-based, including species that evolve by stone or trade in the original games.

## Starter choice

On first entry (guest or account), the player picks one starter from this pool of ten:

| Starter | Evolves at | Into | Evolves at | Into |
| --- | --- | --- | --- | --- |
| Bulbasaur | 16 | Ivysaur | 32 | Venusaur |
| Charmander | 16 | Charmeleon | 36 | Charizard |
| Squirtle | 16 | Wartortle | 36 | Blastoise |
| Pikachu | 22 | Raichu | | |
| Pidgey | 18 | Pidgeotto | 36 | Pidgeot |
| Abra | 16 | Kadabra | 36 | Alakazam |
| Machop | 28 | Machoke | 40 | Machamp |
| Geodude | 25 | Graveler | 40 | Golem |
| Gastly | 25 | Haunter | 40 | Gengar |
| Dratini | 30 | Dragonair | 45 | Dragonite |

## Post-race drops

After each race that granted XP, the server rolls a drop: 25% chance. A drop is one Pokémon from the catchable pool: every base-form species of the Kanto Pokédex (#001–#151), starters included. Evolved forms are only obtained by evolving. The species is drawn by rarity tier, then uniformly within the tier:

| Tier | Tier weight | Examples |
| --- | --- | --- |
| Common | 60 | Rattata, Caterpie, Pidgey |
| Uncommon | 30 | Pikachu, Growlithe, Abra |
| Rare | 9 | Dratini, Lapras, Eevee |
| Legendary | 1 | Articuno, Zapdos, Moltres, Mewtwo, Mew |

Every species in the pool has a tier in species data. A dropped Pokémon joins the collection at level 5. A duplicate species converts into 50 bonus XP for the racer instead (provisional; revisit once the loop is playable).

## Demo

A development seed provides an account whose racer is a few races short of evolving, so the loop can be shown in class without changing these rules.


## UI expansion — 2026-10-01

The current user-directed onboarding now offers Bulbasaur, Charmander and Squirtle (the older ten-starter proposal above is superseded). All 151 Kanto species now have local front, idle and walk artwork and appear in the Pokédex catalog.

The requested achievement-based legendary direction is represented by proposed goals in `src/config/achievements.ts`. These goals are previews, not live reward grants, and supersede the random legendary-drop proposal above when that backend is implemented. Exclude these five species from ordinary encounter rolls:

| Reward | Proposed requirements (both required) |
| --- | --- |
| Articuno | 50 finished races and 2 badges |
| Zapdos | 25 wins and 4 badges |
| Moltres | 30 races at 95%+ accuracy and 6 badges |
| Mewtwo | 200 finished races and 8 badges |
| Mew | 100 distinct collected species and 8 badges |

Eight proposed badge milestones: finish 1, 5, 10, 25, 50, 75, 100 and 150 races. These values are tunable proposals; they do not alter typing speed or race ranking. A future server implementation must evaluate verified race results and grant each achievement/reward exactly once per account. The frontend's sample metrics must never authorize grants.

## Saved collection — 2026-10-01

- Starter: on first entry every player, guest or account, picks Bulbasaur, Charmander or Squirtle (`gameConfig.progression.starterDexes`). The server saves it once at level 5 with 0 XP as the partner and refuses any other species or a second starter. Creating a room, "Faire une course", a room link, a room code and the trainer hub all send a player without a starter to `/play/choose-starter` first, then carry on to where they were going.
- Collection: one row per species per guest identity (`owned_pokemon`), so an account keeps the collection its guest built (the account reuses the guest id, inside the account-creation transaction). Logging into an existing account shows that account's own collection; the guest's is not merged (H2). Exactly one partner per trainer, enforced by a partial unique index.
- Partner: chosen among owned Pokémon in PC storage and saved on the server. Each race records each participant's partner at the start (`race_participants.partner_dex`), so the race map, leader bar, results, podium and past results keep the Pokémon that raced. Species never change speed.
- Statistics come from settled races only: races, wins, average WPM and accuracy average the ranked results; the hub lists the last three races. XP is not granted yet, so its column shows "—" and levels stay at 5.
- Badges: the eight badges (`gameConfig.badges`, adding Volcano and Earth to the first six) are granted once, inside the race settlement, at 1, 5, 10, 25, 50, 75, 100 and 150 races finished to the end. A racer stopped by the time limit or who abandoned earns no badge from that race. A missed milestone catches up at the next finished race.
- Legendary goals show the trainer's real progress; granting the legendaries is still to build.
- Test account: `ash` (normal rights) holds all 151 species with Pikachu as partner and all eight badges, created by the seed when `SEED_ASH_PASSWORD` is set.
