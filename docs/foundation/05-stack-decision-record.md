# 05 Stack Decision Record

Status: canonical decision
Scope: current foundation stack direction
Related: [Architecture options](../research/2026-05-23-architecture-options-evaluation.md), [ADR-0001](../decisions/0001-rust-wasm-core-typescript-host.md), [Quality gates](07-quality-gates.md)

## Decision

Adopt this foundation direction:

```text
Rust core + WASM wrapper + TypeScript/Vite browser host + replaceable renderer
```

The first implementation should not begin as a Phaser-first app. Phaser remains allowed only by future ADR for a specific game/slice.

## Why this stack

Rust gives the project a serious deterministic core for movement, interactions, registry validation, save schema, future replay, and future agent-evaluable simulation.

TypeScript/Vite gives the project a practical browser host for DOM, routing, input capture, audio unlock, build tooling, and static deployment.

A replaceable renderer prevents the first renderer choice from becoming the architecture. Canvas2D may be enough for a tiny first room; PixiJS may be justified if sprite batching and effects are needed.

## Current selected components

Current decisions:

- Language for core logic: Rust
- Browser boundary: WebAssembly via wasm-bindgen/wasm-pack initially
- Browser host: TypeScript + Vite
- Package manager: pnpm
- Static host: Cloudflare Pages target
- Test direction: Rust tests + Vitest + Playwright
- Renderer: undecided; Canvas2D or PixiJS leading

## Why not Phaser first

Phaser is productive but would make the project look like a conventional browser-game scaffold. It also makes it easier to accidentally mix state truth, scene lifecycle, rendering, and interaction logic. That is not the foundation we want for a portfolio-grade systems-quality project.

## Why not Bevy first

Bevy is technically interesting, but it risks too much payload and browser integration complexity for the hub shell. It may be appropriate for a future standalone game.

## Why not WebGPU first

WebGPU is impressive, but WebGPU-only is too risky for the first public front door. WebGPU should be progressive enhancement after the first deterministic slice works and has a fallback.

## Reversal cost

Moderate. If Rust/WASM proves too heavy for the hub core, `hub-core` can remain small or be repurposed for validation/replay while more runtime logic moves to TypeScript. If Canvas2D is too limited, the renderer can be swapped for PixiJS because rendering is not the source of truth.

## Decision status

Accepted for foundation. Revisit only with a new ADR and evidence from implementation, profiling, or usability testing.
