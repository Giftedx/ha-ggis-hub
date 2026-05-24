# 2026-05-22 Implementation Sequence Plan

> **Historical plan, preserved as provenance.** Links in this plan may point to docs that have since moved to `docs/archive/` as part of the 2026-05-23 foundation prune. The current canonical foundation lives at `docs/foundation/` (5 numbered files).

Status: planned implementation sequence
Scope: ordered slices after documentation foundation
Related: [First Perfect Slice](../foundation/10-first-perfect-slice.md), [Architecture overview](../architecture/overview.md), [Quality gates](../foundation/07-quality-gates.md)

## Goal

Move from documentation foundation to executable foundation without losing the quality bar.

## Slice 1: repository and toolchain skeleton — complete 2026-05-23

Create:

- `package.json`
- `pnpm-lock.yaml`
- `Cargo.toml`
- `crates/hub-core/Cargo.toml`
- `crates/hub-wasm/Cargo.toml`
- basic TypeScript config
- basic Vite config

Acceptance:

- Complete: Rust workspace builds `hub-core` and `hub-wasm`.
- Complete: Vite app builds a minimal framework-free shell.
- Complete: docs updated from “not scaffolded” to “skeleton exists.”
- Verification recorded in [Slice 1 executable foundation report](../audit/2026-05-23-slice-1-executable-foundation-report.md).

## Slice 2: hub-core movement and doors — complete 2026-05-23

Created Rust core types for:

- position
- bounds
- input vector
- player state
- door definition
- interaction result

Acceptance:

- Complete: movement tests pass.
- Complete: door proximity tests pass.
- Complete: deterministic tick behavior is proven with fixed integer movement tests.
- Verification recorded in [Slice 2 hub-core movement and doors report](../audit/2026-05-23-slice-2-hub-core-movement-and-doors-report.md).

## Slice 3: WASM boundary — complete 2026-05-23

Exposed core through `hub-wasm` and added the TypeScript boundary loader seam.

Acceptance:

- Complete: WASM build works.
- Complete: TypeScript can initialize a generated module through `src/wasm/boundary.ts`.
- Complete: boundary tests cover invalid inputs.
- Verification recorded in [Slice 3 WASM boundary report](../audit/2026-05-23-slice-3-wasm-boundary-report.md).

## Slice 4: TypeScript host lifecycle — complete 2026-05-23

Created host modules for:

- game module contract
- lifecycle management
- input sampling
- direct play launch
- registry mapping

Acceptance:

- Complete: Vitest covers registry validation/mapping, direct-play planning, keyboard input sampling, lifecycle state transitions, and app model integration.
- Complete: TypeScript strict mode passes.
- Complete: Verification recorded in [Slice 4 TypeScript host lifecycle report](../audit/2026-05-23-slice-4-typescript-host-lifecycle-report.md).

## Slice 5: renderer decision and first room — complete 2026-05-23

Selected Canvas2D by [ADR-0005](../decisions/0005-canvas2d-first-room-renderer.md) and created the first browser-visible room path:

- generated wasm-bindgen browser package under `src/generated/hub-wasm/`
- `src/wasm/generated-loader.ts` for host initialization
- `src/hub/room.ts` first-room controller driven by `HubCoreWorld`
- `src/render/canvas-room.ts` hand-rolled Canvas2D renderer
- host shell canvas, controls copy, reduced-motion pause, direct-play fallback

Acceptance:

- Complete: renderer decision captured without adding a dependency.
- Complete: first room renders in the Vite build.
- Complete: haggis movement is advanced through the Rust/WASM world boundary.
- Complete: door prompt renders from core interaction state.
- Complete: direct play remains outside the canvas and available on fallback.
- Complete: Playwright browser smoke passes with no console errors (`scripts/smoke-door-launch.mjs` walks haggis to launchable door, presses Enter, asserts the WHS URL is navigated to).
- Beyond plan: ported WHS croft procedural drawers (haggis, hearth, walls, floor, window, mantelpiece, doors, particles) so the room matches WHS character quality. Wired door interaction → game launch via interact key (Enter/Space/E) and pointer-down tap (mobile). Source files at `src/render/whs-{haggis,hearth,bothy}.ts`. Smokes: `scripts/smoke-door-launch.mjs` (keyboard), `scripts/smoke-door-tap.mjs` (touch).

## Slice 6: deployment hardening — complete 2026-05-23

Created:

- `public/_headers` matching the [Cloudflare Pages spec](../deployment/cloudflare-pages.md) (CSP with `wasm-unsafe-eval`, HSTS, X-Frame-Options DENY, COOP/CORP, locked Permissions-Policy, immutable asset cache, revalidate HTML).
- `public/_redirects` (SPA fallback `/*  /index.html  200`).
- `scripts/deploy-config.test.ts` — vitest unit asserts on required headers + CSP directives + cache policies.
- `scripts/verify-dist.mjs` — post-build artifact gate: hashed assets, no source maps, headers/redirects shipped to dist, bundle under 200 KB.
- `pnpm build:verified` chains build + verify-dist. `pnpm verify` extended to include it.
- `.github/workflows/ci.yml` runs the full chain on push/PR (typecheck → vitest → build → verify-dist + cargo workspace tests).

Acceptance:

- Complete: local build emits `dist/_headers`, `dist/_redirects`, hashed `dist/assets/*` (verify-dist gate).
- Complete: source map policy enforced via vite.config `sourcemap: false` + verify-dist asserts no `.map` files in `dist/`.
- Complete: headers tested via `deploy-config.test.ts` (6 assertions). Cloudflare preview deploy will pick the same file as production.

## Slice 7: saves and the C hash primitive — partial (C hash done, save framework deferred)

The C hash primitive landed (first hard-language commitment from [Craft commitments](../foundation/12-craft-commitments.md)). The save framework is deferred until the hub has stateful progress to persist — the v1 hub is stateless (walk + click door → launch external game; no progress, settings, or preferences).

Done:

- `c/fnv1a.c` — committed C kernel.
- `crates/hub-hardlang/src/lib.rs` — `#![allow(unsafe_code)]` FFI shim, the one and only unsafe relaxation in the workspace.
- `crates/hub-hardlang/tests/differential_hash.rs` — published reference vectors + 100 000-case proptest diff against `hub_core::hash::fnv1a_64`.

Deferred (no v1 use case):

- Save schema + versioned migration framework.
- Save integrity check using FNV-1a 64-bit.
- Golden migration tests.

Re-open when a stateful slice (settings, run-history, customization) needs persistence.

## Slice 8: WebAssembly Text showcase — complete

Hand-written `xoshiro128**` in WAT plus differential test against the Rust default backend.

Done:

- `asm/xoshiro128_starstar.wat` — hand-rolled WAT kernel.
- `crates/hub-hardlang/tests/differential_rng.rs` — `wasmi` instantiates the WAT, then asserts byte-identical output against the Rust implementation across a long stream.

Acceptance:

- Differential test passes for 100 000+ outputs.
- WAT file is readable + commented (single file, side-by-side comparable with the Rust impl).

## Slice 9: `haggis-eval` CLI — fully wired (8 real subcommands + 1 informational stub)

Go orchestration tool with FNV-1a-signed JSON reports.

Wired:

- `rust` — `cargo fmt --check` + `clippy -D warnings` + `cargo test --workspace`.
- `ts` — `pnpm tsc --noEmit` + `pnpm vitest run` + `pnpm run build`.
- `security` — `pnpm vitest run scripts/deploy-config.test.ts` (public/_headers + _redirects assertions; shipped 2026-05-23).
- `browser` — `node scripts/run-browser-smokes.mjs` (build → vite preview → smoke-door-launch keyboard + smoke-door-tap touch + smoke-pointer-drive touch-drag → teardown; shipped 2026-05-23).
- `determinism` — `node scripts/run-determinism-smoke.mjs` (loads hub twice with fixed `?seed=N`, applies identical scripted input, asserts final state-hash matches between runs; shipped 2026-05-23 with `?seed=` URL param + `window.__stateHash()` dev hook).
- `visual` — `node scripts/run-visual-gate.mjs verify` (build → vite preview → perceptual aHash diff vs `tests/golden/bothy-idle-seed-42.png` at Hamming distance ≤ 18/256; shipped 2026-05-23, golden bootstrapped same day on Windows, verified on Linux CI 2026-05-24 at 1-bit drift — comfortably inside tolerance).
- `perf` — two halves: (a) `pnpm run build` + `node scripts/perf-budgets.mjs` enforces per-asset budgets declared in `perf-budgets.json` (index ≤64 KB, hub_wasm_bg ≤48 KB, total ≤200 KB; current 74 KB / 37% of total); (b) `node scripts/run-paint-gate.mjs` boots vite preview and asserts the median over 3 samples of W3C Paint Timing API metrics (first-contentful-paint, largest-contentful-paint via PerformanceObserver, domContentLoadedEventEnd, loadEventEnd) against `perf-budgets.json` `paint.max_ms`. Hand-rolled via existing Playwright + the W3C primitives directly — no Lighthouse npm dep. Shipped 2026-05-24.
- `differential rng` — WAT vs Rust xoshiro128**.
- `differential hash` — C vs Rust FNV-1a, 100k-case fuzz.
- `all` — every wired gate + signed report under `target/haggis-eval/all-<utc>.json`. Current: 15 gates, ~3.5 min end-to-end (warm Rust cache; ~5–6 min cold).

Outstanding stubs (`exit 78`):

- `slice <name>` — `slices.toml` gate-set config not yet present (spec design work; would let releasers pick "run gate-set X" for ad-hoc bundles).

Acceptance:

- Complete: single command (`haggis-eval all`) answers "is this slice good?" across all 8 wired categories (rust, ts, security, perf, browser, determinism, visual, differential).
- Complete: exits non-zero on any failure.
- Complete: orchestration logic unit-tested (`internal/gate/`, `internal/report/`, `internal/fnv/` test files).
- Complete: referenced from the release gate (README "Current executable gates" section).
