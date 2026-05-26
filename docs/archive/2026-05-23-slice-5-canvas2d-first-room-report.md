# 2026-05-23 Slice 5 Canvas2D First Room Report

> **Archived 2026-05-23.** Per-slice audit reports are superseded by the `haggis-eval` FNV-signed tamper-evident JSON reports under `target/haggis-eval/` (see [tools/haggis-eval/README.md](../../tools/haggis-eval/README.md)). Preserved for provenance.

Status: current
Scope: renderer decision and first browser-visible room sub-slice
Related: [Implementation sequence](../plans/2026-05-22-implementation-sequence.md), [ADR-0005](../decisions/0005-canvas2d-first-room-renderer.md), [Runtime boundaries](../architecture/runtime-boundaries.md)

## Summary

Slice 5 is now partially complete. The renderer decision is made and documented: the First Perfect Slice uses a hand-rolled Canvas2D renderer, not PixiJS. The Vite host now initializes the generated wasm-bindgen package, creates a room controller backed by the `HubCoreWorld` boundary, renders a Canvas2D bothy room, advances the haggis through Rust/WASM movement state, and keeps direct play available outside the canvas.

The remaining Slice 5 blocker is browser-smoke infrastructure with console-error detection.

## Files added

- `docs/decisions/0005-canvas2d-first-room-renderer.md`
- `docs/audit/2026-05-23-slice-5-canvas2d-first-room-report.md`
- `src/generated/hub-wasm/hub_wasm.js`
- `src/generated/hub-wasm/hub_wasm.d.ts`
- `src/generated/hub-wasm/hub_wasm_bg.wasm`
- `src/generated/hub-wasm/hub_wasm_bg.wasm.d.ts`
- `src/generated/hub-wasm/package.json`
- `src/wasm/generated-loader.ts`
- `src/hub/room.ts`
- `src/hub/room.test.ts`
- `src/render/canvas-room.ts`
- `src/render/canvas-room.test.ts`

## Files changed

- `README.md`
- `docs/README.md`
- `docs/architecture/runtime-boundaries.md`
- `docs/decisions/0002-renderer-evaluation-plan.md`
- `docs/decisions/README.md`
- `docs/plans/2026-05-22-implementation-sequence.md`
- `src/app/app.ts`
- `src/app/app.test.ts`
- `src/main.ts`
- `src/style.css`

## Behavior added

- Browser build imports and initializes generated `hub-wasm` output.
- The host creates a first-room Canvas2D surface.
- Haggis movement advances through `HubCoreWorld.tickPlayer`.
- Door prompts come from `HubCoreWorld.interactionFor`.
- Canvas2D draws room background, active/locked doors, highlighted reachable door, haggis marker, and prompt text.
- Direct play remains a normal anchor outside the canvas.
- Reduced-motion visitors receive a paused room state rather than continuous RAF animation.
- Canvas2D initialization failure produces a readable fallback status while preserving direct play.

## Verification run

```bash
wasm-pack build crates/hub-wasm --target web --out-dir ../../src/generated/hub-wasm --release
pnpm exec vitest run src/render/canvas-room.test.ts src/hub/room.test.ts
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm run build
```

Observed build output:

```text
dist/index.html                         0.50 kB │ gzip: 0.32 kB
dist/assets/hub_wasm_bg-DecIi2fU.wasm  17.84 kB │ gzip: 7.99 kB
dist/assets/index-BH2vgBje.css          1.77 kB │ gzip: 0.85 kB
dist/assets/index-D-6qxswT.js          13.93 kB │ gzip: 5.07 kB
```

## Checks not yet run

- Browser smoke with console-error detection: not introduced yet; remains the planned remainder of Slice 5.
- Full Rust skeleton gate after this report: should be run before considering the combined working tree complete.

## Open risks

- The generated wasm-bindgen package is checked into `src/generated/hub-wasm/` so a clean checkout can build. If the project later prefers generated artifacts to stay untracked, `package.json` must gain a deterministic prebuild step and the quality gate must run it before `pnpm run build`.
- RAF lifecycle cleanup is not yet wired through a mounted game-module instance; the current app shell starts the first room directly. Route/module cleanup should be completed when the room becomes a formal `GameModule`.
- Browser smoke infrastructure must verify there are no runtime console errors and that the direct-play anchor remains reachable.
