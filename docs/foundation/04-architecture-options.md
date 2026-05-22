# 04 Architecture Options

Status: canonical research summary  
Scope: evaluated architecture paths before implementation  
Related: [Stack decision record](05-stack-decision-record.md), [ADR-0001](../decisions/0001-rust-wasm-core-typescript-host.md)

## Evaluation criteria

Options are evaluated against:

- technical impressiveness
- first-slice delivery risk
- browser compatibility
- testability
- performance control
- dependency cost
- ability to support agent-evaluable deterministic logic
- suitability for a playable portfolio hub

## Option A: Vite + TypeScript + Phaser

Phaser is productive for 2D browser games and matches Wild Haggis Survivors experience.

Pros:

- fastest conventional path to playable output
- built-in scenes, input, cameras, physics, loader
- many examples and community patterns

Cons:

- less technically distinctive
- engine lifecycle can dominate architecture
- easy to couple simulation truth to scene/rendering state
- larger dependency surface than a tiny hub may need

Use when:

- speed matters more than technical distinction
- building a secondary conventional arcade game
- a future ADR explicitly accepts Phaser’s tradeoffs

Do not use as the default foundation.

## Option B: Vite + TypeScript + PixiJS/custom loop

PixiJS is a renderer-first option. A custom loop and state model provide more architectural control than Phaser.

Pros:

- strong 2D rendering without a full game engine
- easier to keep simulation separate
- good fit for polished hub presentation
- practical compromise between hand-rolled and dependency-heavy

Cons:

- scene lifecycle, input, collision, debug tools, and interaction prompts must be built
- still not a systems-language showcase unless paired with WASM

Use when:

- the renderer needs sprites, batching, filters, and visual polish
- Canvas2D becomes limiting
- bundle impact is acceptable and documented

## Option C: Rust/WASM simulation core + TypeScript host

Rust owns deterministic core logic. TypeScript owns browser APIs, rendering orchestration, input capture, audio, and routing.

Pros:

- strongest balance of technical depth and browser practicality
- testable core without browser
- deterministic replay and future agent evals become natural
- clear separation of truth and presentation
- aligned with the project’s systems-quality standard

Cons:

- build and debugging complexity
- JS/WASM boundary must be coarse and data-oriented
- easy to overuse Rust for browser problems where it is not helpful

Use when:

- state transitions matter
- deterministic tests matter
- portfolio technical signal matters
- future simulations/evals matter

Recommended.

## Option D: Rust + Bevy to WASM

Bevy offers a full Rust ECS/game-engine path.

Pros:

- strong Rust-native story
- serious ECS architecture
- native testing/profiling possible

Cons:

- larger WASM payload
- heavier browser integration
- first-load risk for a small hub
- less natural DOM/route/portfolio integration

Use when:

- a future standalone game intentionally wants to be a Bevy showcase

Do not use as the hub shell.

## Option E: full custom WebGL2/WebGPU renderer

A hand-rolled renderer is the strongest graphics flex but the highest risk.

Pros:

- maximum control
- unique visual identity
- impressive if delivered well

Cons:

- asset pipeline, text, batching, resizing, context loss, GPU differences, and fallbacks are real work
- WebGPU-only would be too restrictive for the initial hub

Use when:

- the renderer itself becomes the product/portfolio story
- after the first slice has enough foundation to absorb the complexity

Recommended as later progressive enhancement, not first-slice foundation.

## Summary

Canonical decision: Rust/WASM core + TypeScript/Vite host + replaceable renderer.

Renderer remains open between Canvas2D and PixiJS for the first slice. That choice should be made by the first implementation ADR after visual complexity is better understood.
