# 00 Project Charter

Status: canonical foundation policy
Scope: identity, purpose, non-negotiables, project boundaries, and product vision
Related: [Stack decision record](05-stack-decision-record.md), [Quality gates](07-quality-gates.md)

## Identity

ha.ggis Hub is the planned playable front door for haggis-themed games at `https://ha.ggis.xyz`.

The domain is part of the product:

```text
ha + ggis = haggis
ha.ggis.xyz = say it without the dot
```

The hub should feel like a small playable place, not a generic landing page. The visitor controls a haggis and enters doors or portals that launch haggis games.

## Purpose

This repository exists to become a professional portfolio-grade project: charming on the surface, serious underneath. It should demonstrate engineering judgment, technical depth, performance awareness, secure deployment, and unusually strong project discipline.

## Non-negotiable quality statement

Small is acceptable. Sloppy is not.

The project must not ship as a barely-working MVP shell. The first public release is a **First Perfect Slice**: deliberately scoped, structurally sound, polished enough to represent the project, and backed by tests and quality gates.

## Relationship to Wild Haggis Survivors

Wild Haggis Survivors is the first real game linked from the hub. It remains a separate project and must not be swallowed into this repository.

Boundary rules:

- The hub may link to WHS.
- The hub may later mount a WHS static build under `/wild-haggis-survivors/`.
- The hub does not own WHS gameplay state.
- The hub does not mutate WHS save data.
- If shared progress is ever displayed, it must use an explicit read-only contract or exported summary.

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
2. there is a playable haggis
3. there is a clear way to play Wild Haggis Survivors
4. the project is bespoke and carefully built

### Tone

- Scottish/haggis charm
- warm mischief
- technical polish
- no generic SaaS/portfolio template smell

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
2. visitor sees haggis and movement instructions
3. visitor walks to the WHS door
4. visitor sees `Press E to play Wild Haggis Survivors`
5. visitor launches WHS

Direct path:

1. visitor lands at `ha.ggis.xyz`
2. visitor clicks/taps `Play Wild Haggis Survivors`
3. visitor launches WHS without needing to understand movement

Fallback path:

1. visitor cannot or does not use canvas/game controls
2. visitor still has semantic HTML links and readable instructions

### Not product goals yet

- account system
- cloud save
- multiplayer presence
- hub achievements
- large overworld
- many finished games
- marketplace/storefront behavior

These are not rejected forever. They are rejected from the First Perfect Slice.
