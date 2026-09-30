# PokéType

A school project: real-time multiplayer typing races with a top-down Pokémon world, collectible racers, and evolution through play. Players aged 10–12 practise typing in French and English.

**Status:** requirements and design only. No application code yet; setup, run and test commands arrive with the scaffolding story.

## How work happens

Development runs through Claude Code. `CLAUDE.md` holds the project context; the backlog lives on the GitHub project board as epics and stories with Given/When/Then criteria, groomed from `docs/REQUIREMENTS.md`. Each finished story is one commit.

## Documentation

- [Original school brief](docs/source/cahier-des-charges.docx) and [searchable extraction](docs/source/cahier-des-charges-extracted.md).
- [Requirement checklist](docs/REQUIREMENTS.md), with every requirement ID and school priority.
- [Decisions and open questions](docs/DECISIONS.md).
- [Pokémon progression rules](docs/PROGRESSION.md): XP by place, level table, starters, drops.
- [Visual guide and mockups](docs/design/README.md).
- [Architecture proposal](docs/ARCHITECTURE.md), [milestones](docs/IMPLEMENTATION_PLAN.md) and [acceptance checks](docs/ACCEPTANCE.md).

## Approved direction

Fully retro handheld-game design (the modern-card alternative was rejected). Pokémon race on a shared top-down winding route. Players pick a starter from ten, earn XP by final place, evolve through sustained play, and collect new Pokémon from random post-race drops. Species and evolution never grant typing-speed advantages.

The five mockups are concept references: build real components, text and state, never screenshots.

## Legal notice

PokéType is a non-commercial school project made for educational purposes. It has no ads, payments or revenue. Pokémon and all related names, characters and images are trademarks of Nintendo, Game Freak and The Pokémon Company. This project is not affiliated with or endorsed by them.
