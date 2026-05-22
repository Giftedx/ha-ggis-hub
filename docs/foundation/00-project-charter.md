# 00 Project Charter

Status: canonical foundation policy  
Scope: identity, purpose, non-negotiables, and project boundaries  
Related: [Product vision](03-product-vision.md), [First Perfect Slice](10-first-perfect-slice.md), [Stack decision record](05-stack-decision-record.md)

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
