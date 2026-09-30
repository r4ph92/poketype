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
