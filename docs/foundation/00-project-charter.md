# 00 Project Charter

Status: canonical foundation policy
Scope: identity, purpose, non-negotiables, project boundaries, and product vision
Related: [Stack decision record](05-stack-decision-record.md), [Quality gates](07-quality-gates.md), [Haggis canon and WHS design language](../research/2026-05-23-haggis-canon-and-whs-design-language.md)

## Identity

ha.ggis Hub is the **lobby** for a planned family of haggis-themed games at `https://ha.ggis.xyz`. It is **not a game itself** — it is the cohesive front door that lets a visitor walk a haggis up to whichever game they want to play.

The domain is part of the product:

```text
ha + ggis = haggis
ha.ggis.xyz = say it without the dot
```

The hub should feel like a small playable place, not a generic landing page. The visitor controls the **wild haggis** (the recurring protagonist across the haggis-games family) and enters doors or portals that launch individual games.

Each future haggis-themed game lives at its own URL or path with its **own genre, art direction, gameplay, and tone**. The hub also has its **own** visual language, typography, voice register, and mood — it is a separate product, not a skin of any one game. What ties the hub and the games together is **canon**, not design tokens: the same wild-haggis protagonist, the same Highland setting, the same Scots-tinted family voice, the same haggis joke. Visitors should recognise the hub and any game as members of the same world while still seeing each as its own thing. See [Haggis canon and WHS design language](../research/2026-05-23-haggis-canon-and-whs-design-language.md) for the canonical references every project in the family must honour.

## Purpose

This repository exists to become a professional portfolio-grade project: charming on the surface, serious underneath. It should demonstrate engineering judgment, technical depth, performance awareness, secure deployment, and unusually strong project discipline.

## Non-negotiable quality statement

Small is acceptable. Sloppy is not.

The project must not ship as a barely-working MVP shell. The first public release is a **First Perfect Slice**: deliberately scoped, structurally sound, polished enough to represent the project, and backed by tests and quality gates.

## Relationship to Wild Haggis Survivors

Wild Haggis Survivors (WHS) is the **first** real game linked from the hub and the **brand anchor** for every other haggis-themed game that will follow. It remains a separate project (`C:\Users\aggis\dev\active\wild-haggis-survivors`, deployed at <https://wild-haggis-survivors.pages.dev/>) and must not be swallowed into this repository.

WHS is a Highland-at-dusk, Scots-tinted bullet-heaven where the player is a wild haggis whose iconic uneven legs become the signature mechanic (every input drifts a few degrees clockwise). It has a published design system (`DESIGN.md` in the WHS repo) — a defined palette, monospace typography with stroked titles, square corners, 8 px grid, Scots-tinted English copy with optional Scots overlay. That is **WHS's** design language and belongs to WHS. **The hub does not adopt it wholesale.** The hub picks its own palette, typography, register, and mood from the same shared canon (Highland setting, Scots voice, wild-haggis protagonist) so the two feel related without the hub looking like a WHS clone.

Boundary rules:

- The hub may link to WHS.
- The hub may later mount a WHS static build under `/wild-haggis-survivors/`.
- The hub does not own WHS gameplay state.
- The hub does not mutate WHS save data.
- If shared progress is ever displayed, it must use an explicit read-only contract or exported summary.
- **The hub does not adopt any one game's design tokens.** The hub has its own palette, typography, register, and mood, drawn from the shared haggis canon — not from WHS's `DESIGN.md`. Family resemblance comes from canon (the same wild-haggis protagonist, the same Highland setting, the same Scots-tinted voice family), not from copied tokens. See the [research doc](../research/2026-05-23-haggis-canon-and-whs-design-language.md) for what is shared (canon) and what is not (visual language).

### Future games

Future haggis-themed games will each get their own door in the hub. Each is a separate repo with its own design language. The hub's responsibility is the cohesive lobby; each game owns its interior.

## Domain shape

Target public shape:

```text
https://ggis.xyz
  -> redirect to https://ha.ggis.xyz

https://ha.ggis.xyz/
  -> playable hub

https://ha.ggis.xyz/wild-haggis-survivors/
  -> eventual canonical WHS launch path
```

The exact WHS mount strategy remains open until deployment is scaffolded and tested.

## Contributor promise

A new contributor should be able to understand the project from the docs alone:

- what it is
- what it refuses to be
- how it is architected
- how decisions are made
- how quality is enforced
- how agents are allowed to operate

If a contributor has to infer foundational policy from code style or chat history, the documentation has failed.

## Product vision

### One-sentence vision

ha.ggis Hub is a tiny playable haggis world that acts as the charming, technically serious front door to haggis games.

### First impression

A visitor should immediately understand:

1. the domain joke
2. there is a playable wild-haggis character
3. there are doors leading to haggis-themed games — one of which (WHS) is open
4. the project is bespoke and carefully built
5. this place visibly belongs to the same world as the games inside — recognised through the protagonist, setting, and voice, not by being a visual copy of any one game

### Tone

- Scottish/haggis charm with a Scots-tinted register — the hub's own register, in the same family as WHS but not a copy
- warm mischief
- technical polish
- no generic SaaS/portfolio template smell
- **must read as a sibling of the haggis games** — same world, same protagonist, same voice family — **while still being its own distinct product** with its own visual language

Potential copy:

```text
ha.ggis.xyz
say it without the dot
```

or:

```text
ha + ggis = haggis
home of haggis games
```

### First hub fiction

Current leading concept: **The Haggis Bothy**.

Why:

- more distinctive than a generic arcade
- Scottish enough to support the joke
- small enough for a first polished room
- can plausibly contain strange doors, trophies, notices, and portals

### Required user paths

Playable path:

1. visitor lands at `ha.ggis.xyz`
2. visitor sees the wild haggis in the lobby scene
3. visitor walks to the WHS door (no on-screen handholding — interaction is discoverable)
4. visitor sees a Scots-tinted prompt naming the game
5. visitor launches WHS

Direct path:

1. visitor lands at `ha.ggis.xyz`
2. visitor uses the small corner link to enter WHS directly
3. visitor launches WHS without needing to understand movement

Fallback path:

1. visitor cannot or does not use canvas/game controls
2. visitor still has semantic HTML links and readable instructions

As more games ship, each gets its own additional door. The lobby scene scales by adding portals, not by replacing the lobby concept.

### Not product goals yet

- account system
- cloud save
- multiplayer presence
- hub achievements
- large overworld
- many finished games (the hub ships with one available door; others land as their games do)
- marketplace/storefront behavior

These are not rejected forever. They are rejected from the First Perfect Slice.
