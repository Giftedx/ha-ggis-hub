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
- Beyond plan: ported WHS croft procedural drawers for room fixtures (hearth, walls, floor, window, mantelpiece, doors, particles), then replaced the earlier haggis stand-in with the hub-original Wee Chieftain drawer. Wired door interaction → game launch via interact key (Enter/Space/E) and pointer-down tap (mobile). Source files include `src/render/bothy-haggis.ts`, `src/render/whs-hearth.ts`, and `src/render/whs-bothy.ts`. Smokes: `scripts/smoke-door-launch.mjs` (keyboard), `scripts/smoke-door-tap.mjs` (touch).

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

## Slice 9: `haggis-eval` CLI — fully wired (16 gate categories, 0 stubs)

Go orchestration tool with FNV-signed tamper-evident JSON reports.

Wired:

- `rust` — `cargo fmt --check` + `clippy -D warnings` + `cargo test --workspace`.
- `rust-cov` — `cargo llvm-cov --workspace --exclude hub-wasm --fail-under-lines 100 --fail-under-functions 100`.
- `docs` — `node scripts/check-doc-claims.mjs` rejects report-signing/doc-claim drift.
- `ts` — `pnpm tsc --noEmit` + `pnpm vitest run` + `pnpm run build`.
- `security` — `pnpm vitest run scripts/deploy-config.test.ts` (public/_headers + _redirects assertions; shipped 2026-05-23).
- `browser` — `node scripts/run-browser-smokes.mjs` (build → vite preview → smoke-door-launch keyboard + smoke-door-tap touch + smoke-pointer-drive touch-drag → teardown; shipped 2026-05-23).
- `determinism` — `node scripts/run-determinism-smoke.mjs` (loads hub twice with fixed `?seed=N`, applies identical scripted input, asserts final state-hash matches between runs; shipped 2026-05-23 with `?seed=` URL param + `window.__stateHash()` dev hook).
- `visual` — `node scripts/run-visual-gate.mjs verify` (build → vite preview → perceptual aHash diff vs `tests/golden/bothy-idle-seed-42.png` at Hamming distance ≤ 8/256; visual captures now freeze renderer animation with `?visualGatePhase=0` so the budget measures art drift, not frame timing. Shipped 2026-05-23; phase-frozen recapture shipped 2026-05-25 after local verifies showed timing noise could exceed the tight budget).
- `perf` — two halves: (a) `pnpm run build` + `node scripts/perf-budgets.mjs` enforces per-asset budgets declared in `perf-budgets.json` (index ≤64 KB, hub_wasm_bg ≤48 KB, total ≤200 KB; current 74 KB / 37% of total); (b) `node scripts/run-paint-gate.mjs` boots vite preview and asserts the median over 3 samples of W3C Paint Timing API metrics (first-contentful-paint, largest-contentful-paint via PerformanceObserver, domContentLoadedEventEnd, loadEventEnd) plus the `hub:firstFrame` User Timing mark fired from `src/main.ts` after the first canvas render (the canvas-aware paint metric — chrome's LCP heuristic collapses to FCP on this canvas-first app, so we mark the moment WASM has booted and the renderer has issued its first draw, scheduled inside a rAF so the compositor has posted). All five metrics asserted against `perf-budgets.json` `paint.max_ms`. Hand-rolled via existing Playwright + the W3C primitives directly — no Lighthouse npm dep. Shipped 2026-05-24.
- `differential rng` — WAT vs Rust xoshiro128**.
- `differential hash` — C vs Rust FNV-1a, 100k-case fuzz.
- `slice <name>` — dispatches a named gate-set bundle from `tools/haggis-eval/slices.json` (pivoted from `slices.toml` in the original spec because haggis-eval is stdlib-only Go and `encoding/json` is stdlib while TOML is not). Bundled bundles: `fast` (ts + perf), `pre-merge` (ts + security + perf + browser + determinism + visual + a11y), `release` (== `all` minus the FNV-signed report write). `slice` with no argument (or `slice list`) prints available bundles. `HAGGIS_SLICES_PATH` overrides the config path. Shipped 2026-05-24.
- `a11y` — `node scripts/run-a11y-gate.mjs` (build → vite preview → 26 WCAG 2.2 AA spot-checks via Playwright covering page language, viewport zoom, page title, canvas + interactive element accessible names, persistent fallback help, live door status, label-in-name, keyboard reachability, focus indicator visibility, computed contrast ratio on every declared text pair, self-hosted font load, and runtime page errors). No axe-core / pa11y dep — the hub's a11y surface is small + stable enough that focused asserts are more honest than a generic rule engine. Shipped 2026-05-24, drove a `outline: none` fix on `.scene-direct:focus-visible` (WCAG 2.4.7) found during bring-up; opt-in music button and font verification added 2026-05-27.
- `soak` — `node scripts/run-soak-gate.mjs` (build → vite preview → 15-second RAF loop soak → CDP `HeapProfiler.collectGarbage` before/after → assert heap growth < 5 MB). Catches per-frame allocation leaks, RAF accumulator leaks, and event-listener stacking. No leak-detection lib dep. Shipped 2026-05-24.
- `coverage` — `pnpm vitest --coverage` with V8 provider and package thresholds.
- `supply-chain` — lightweight lockfile / dependency hygiene checks, wired into the release slice.
- `all` — every wired gate + FNV-signed report under `target/haggis-eval/all-<utc>.json`. Current: 15 gate subcommands (24 individual checks), ~3.5 min end-to-end (warm Rust cache; ~5–6 min cold; soak adds ~20s).

Outstanding stubs (`exit 78`):

- None. Slice 9 fully wired as of 2026-05-24.

Acceptance:

- Complete: single command (`haggis-eval all`) answers "is this slice good?" across all wired gate categories: rust, rust-cov, ts, coverage, security, perf, browser, multi-browser, determinism, visual, a11y, soak, supply-chain, differential rng, differential hash, and slice orchestration.
- Complete: exits non-zero on any failure.
- Complete: orchestration logic unit-tested (`internal/gate/`, `internal/report/`, `internal/fnv/` test files).
- Complete: referenced from the release gate (README "Current executable gates" section).
