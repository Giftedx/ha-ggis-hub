# ADR-0005: Canvas2D Renderer for First Room

Status: accepted
Date: 2026-05-23
Related: [ADR-0001](0001-rust-wasm-core-typescript-host.md), [ADR-0002](0002-renderer-evaluation-plan.md), [Runtime boundaries](../architecture/runtime-boundaries.md), [First public release requirements](../foundation/07-quality-gates.md#first-public-release-requirements)

## Context

ADR-0001 requires a replaceable renderer and ADR-0002 defines the evidence needed before choosing the first-slice renderer. Slice 5 needs a tiny playable bothy room: a haggis marker, one active Wild Haggis Survivors door, one locked/future door, and a door prompt driven by deterministic core state.

The current visual scope is intentionally small. It does not require sprite batching, filters, texture atlases, camera systems, or renderer-owned scene lifecycle.

## Decision

Use a hand-rolled Canvas2D renderer for the First Perfect Slice room.

The renderer lives behind a narrow TypeScript interface and consumes immutable room snapshots. `hub-core`/WASM remains the source of movement and door interaction truth; Canvas2D only presents snapshots.

## Evidence

### Bundle impact

Canvas2D adds no runtime package dependency. The first Vite production build after this decision emits:

```text
dist/assets/hub_wasm_bg-DecIi2fU.wasm  17.84 kB │ gzip: 7.99 kB
dist/assets/index-BH2vgBje.css          1.77 kB │ gzip: 0.85 kB
dist/assets/index-D-6qxswT.js          13.93 kB │ gzip: 5.07 kB
```

This is far below the current initial budgets in [Quality gates](../foundation/07-quality-gates.md).

### Lifecycle cleanup plan

The current Canvas2D renderer owns no external resource beyond the provided canvas context. The host room controller owns simulation advancement and rendering calls. When game module lifecycle mounts the room in a later slice, `destroy` must cancel the RAF loop and destroy the keyboard input sampler; no PixiJS/WebGL texture or renderer disposal path is needed.

### Test plan

Current tests cover:

- deterministic room controller ticks through the `HubCoreWorld` boundary before rendering;
- initial room render before movement;
- Canvas2D draw calls for background, launchable/locked doors, highlighted interaction prompt, and haggis marker;
- clean failure when Canvas2D is unavailable.

The broader skeleton gate remains mandatory. A real-browser smoke with console-error detection remains planned for the browser-smoke part of Slice 5.

## Alternatives considered

### PixiJS

Rejected for the first room. PixiJS would add dependency, bundle, texture lifecycle, and renderer cleanup costs before the room needs sprite batching, filters, or texture management. It remains a valid future replacement if measured visual complexity justifies it.

### Phaser

Rejected for the hub foundation by ADR-0001. Phaser remains possible for a future game slice, not for the hub shell renderer.

### Custom WebGL/WebGPU

Rejected for first room because Canvas2D is sufficient and has better fallback characteristics for the current scope.

## Consequences

Positive:

- no new dependency;
- minimal bundle impact;
- clear renderer boundary;
- easy fallback path;
- renderer cannot become gameplay truth by accident.

Negative:

- visual polish ceiling is lower than PixiJS for effects-heavy scenes;
- future sprite-heavy presentation may require replacing the renderer;
- Canvas2D draw-call tests are necessarily narrower than full visual regression tests until browser smoke infrastructure lands.

## Reversal path

Replace `src/render/canvas-room.ts` with another implementation that consumes the same `HubRoomRenderSnapshot` shape. If a future ADR selects PixiJS, keep `hub-core`, `src/hub/room.ts`, input sampling, registry, launch planning, and lifecycle boundaries intact.
