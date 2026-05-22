# ADR-0001: Rust/WASM Core, TypeScript Host, Replaceable Renderer

Status: accepted
Date: 2026-05-22
Related: [Architecture options](../foundation/04-architecture-options.md), [Stack decision record](../foundation/05-stack-decision-record.md)

## Context

ha.ggis Hub must be more than a quick browser-game scaffold. It is a professional portfolio project where the foundation should demonstrate serious engineering taste: deterministic core behavior, strong tests, secure deployment, clear runtime boundaries, and carefully justified dependencies.

The original seed plan suggested Vite + TypeScript + Phaser. That path is productive but not distinctive enough as the default foundation.

## Decision

Use:

```text
Rust core + WASM wrapper + TypeScript/Vite browser host + replaceable renderer
```

The renderer remains an implementation choice for the first slice. Canvas2D and PixiJS are the current leading options. Phaser and Bevy are not rejected forever, but they are not the hub foundation.

## Rationale

Rust provides:

- native-testable deterministic logic
- strong correctness tooling
- future replay/eval/headless simulation path
- high technical signal

WASM provides:

- browser delivery for Rust logic
- a clear boundary between core and host

TypeScript/Vite provides:

- practical browser orchestration
- DOM/CSS/audio/input integration
- static deployment pipeline
- familiar frontend testing and build tooling

A replaceable renderer provides:

- freedom to start minimal
- option to adopt PixiJS if justified
- option to add custom WebGL/WebGPU later
- protection against renderer state becoming game truth

## Consequences

Positive:

- strong foundation for testing
- architecture reads as intentional
- future agent evals and deterministic simulation are easier
- less risk of conventional game-engine slop

Negative:

- more build complexity
- WASM debugging cost
- requires discipline at JS/WASM boundary
- first slice may take longer than a pure Phaser scaffold

## Reversal path

If Rust/WASM proves too heavy for the hub, keep `hub-core` small and move non-critical browser behavior to TypeScript. The interface boundary should make this survivable.

If Canvas2D is too limited, replace the renderer with PixiJS behind the same state and lifecycle model.

## Follow-up ADRs expected

- renderer choice for First Perfect Slice
- WHS route/mount strategy
- CI/deployment architecture if Cloudflare Pages build limitations require GitHub Actions + Wrangler
