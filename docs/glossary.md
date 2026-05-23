# Glossary

Status: canonical terminology
Scope: project-specific names and technical terms
Related: [Project charter](foundation/00-project-charter.md), [Architecture overview](architecture/overview.md)

## ha.ggis

The project/domain pun. `ha` + `ggis` = `haggis`; `ha.ggis.xyz` should be read as “haggis dot xyz” or “say it without the dot.”

## Hub

The playable front door at `ha.ggis.xyz`. It is not the same project as Wild Haggis Survivors.

## WHS

Wild Haggis Survivors, the first game linked from the hub. It remains a separate project. See [data and save boundaries](architecture/data-and-save-boundaries.md) for the hub-to-WHS boundary rules.

## Bothy

A small Scottish hut. The leading fiction for the first hub room (see [Project charter — Product vision](foundation/00-project-charter.md#product-vision)). "The Haggis Bothy" is the working name for the first playable scene.

## First Perfect Slice

The smallest public slice that demonstrates the final standard of craft. Acceptance criteria live in [Quality gates — First public release requirements](foundation/07-quality-gates.md#first-public-release-requirements). Replaces MVP framing.

When other docs say "first slice" or "first public slice" they refer to the same concept.

## Slice

A coherent, end-to-end change that advances the project by one verifiable step — code, tests, and documentation in the same commit/PR. See [Autopilot rules](foundation/11-quality-manifesto.md#autopilot-rules). A slice is the unit of work for both humans and agents; "vertical slice" is used interchangeably.

## Host

The TypeScript/Vite browser shell responsible for DOM, routing, input capture, rendering orchestration, audio unlock, and deployment integration.

## Core

The Rust crate (`hub-core`) that owns deterministic state and rules, such as movement, door proximity, registry validation, and future save/replay logic.

## WASM wrapper

The thin WebAssembly boundary (`hub-wasm`) that exposes the Rust core to the TypeScript host via wasm-bindgen.

## Renderer

The browser rendering implementation. It may be Canvas2D, PixiJS, custom WebGL2, or later WebGPU. It must not own gameplay truth. The first-slice renderer is the subject of [ADR-0002](decisions/0002-renderer-evaluation-plan.md).

## Registry

The data-driven catalogue of hub games — id, title, route, status, and launch kind. Defined in [data and save boundaries](architecture/data-and-save-boundaries.md). Scene code reads from the registry rather than hard-coding doors.

## Door

The in-world visual representation of a hub game in the playable scene. A door corresponds 1:1 with a registry entry. Door interaction (the prompt and the launch) is implemented in the Rust core (proximity) plus the TypeScript host (the actual navigation).

## Game module

The TypeScript interface a launchable game must implement so the hub can mount, pause, resume, and destroy it cleanly. Contract is in [runtime boundaries](architecture/runtime-boundaries.md).

## Game instance

The object returned by `GameModule.mount` that the hub holds for the lifetime of the active game. See [runtime boundaries](architecture/runtime-boundaries.md).

## Direct play

The non-game launch path — a plain HTML button outside the canvas that launches Wild Haggis Survivors immediately. Required so visitors who do not engage with the playable hub still reach the linked game. See [Project charter — Product vision](foundation/00-project-charter.md#product-vision).

## Reduced motion

The visitor preference (`prefers-reduced-motion`) for less animation. The first slice must respect this — see [Project charter — Product vision](foundation/00-project-charter.md#product-vision) and [Quality gates — First public release requirements](foundation/07-quality-gates.md#first-public-release-requirements).

## Smoke test

A minimal browser-driven check (Playwright) that confirms the app loads, has no console errors, and exposes the load-bearing surfaces (canvas/fallback, direct play button). See [testing strategy](architecture/testing-strategy.md).

## Eval / Evaluation

A measurement (broader than a test) that judges whether the project is improving on a quality the user cares about — playability, robustness, performance, polish — rather than only checking a known invariant. See [evaluation strategy](architecture/evaluation-strategy.md).

## Autopilot

The intended pattern for autonomous agents to plan, build, review, run gates, and update docs without weakening the project's quality bar. Operational rules in [Autopilot rules](foundation/11-quality-manifesto.md#autopilot-rules); the long-term roadmap of readiness levels is in [autopilot system](architecture/autopilot-system.md).

## Quality gate

A required set of checks that must pass before a change is accepted at a given milestone (PR, main, release, nightly). Defined in [quality gates](foundation/07-quality-gates.md). Gates may be staged but not weakened.

## ADR

Architecture Decision Record. A short document recording a significant decision: context, what was chosen, alternatives, rationale, consequences, and reversal cost. See the [ADR index](decisions/README.md) and [template](decisions/adr-template.md).

## Craft commitments

The catalogue of primitives this project hand-rolls and the artifacts it writes in non-default languages (C, WebAssembly Text, Go). Source of truth: [docs/foundation/12-craft-commitments.md](foundation/12-craft-commitments.md). Where the quality manifesto says "we hand-roll central primitives," that doc names which ones.

## WAT

WebAssembly Text Format — the human-readable textual representation of a WebAssembly module. This project commits to one hand-written WAT artifact, a `xoshiro128**` PRNG kernel, as a deliberate portfolio showcase per [ADR-0004](decisions/0004-language-and-craft-philosophy.md) and [Craft commitments](foundation/12-craft-commitments.md).

## FNV-1a

The Fowler–Noll–Vo non-cryptographic hash function, 64-bit variant. This project commits to a hand-rolled C implementation, used for save-file integrity and stable registry-entry hashes. See [Craft commitments](foundation/12-craft-commitments.md).

## xoshiro128\*\*

A small, fast, statistically reasonable PRNG by Blackman and Vigna. 16 bytes of state, public reference vectors. This project uses it as the canonical deterministic RNG, in two implementations: Rust (default runtime backend) and hand-written WAT (showcase + differential test). See [Craft commitments](foundation/12-craft-commitments.md).
