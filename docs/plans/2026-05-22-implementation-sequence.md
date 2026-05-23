# 2026-05-22 Implementation Sequence Plan

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

## Slice 4: TypeScript host lifecycle

Create host modules for:

- game module contract
- lifecycle management
- input sampling
- direct play launch
- registry mapping

Acceptance:

- Vitest covers pure logic
- TypeScript strict mode passes

## Slice 5: renderer decision and first room

Before adding renderer dependency, write ADR:

- Canvas2D if visuals remain simple
- PixiJS if rendering complexity justifies dependency

Acceptance:

- first room renders
- haggis moves from Rust state
- door prompt works
- direct play works
- Playwright smoke passes with no console errors

## Slice 6: deployment hardening

Create:

- `public/_headers`
- `public/_redirects`
- deployment verification tests/scripts

Acceptance:

- local build emits expected files
- source map policy is enforced
- headers are tested against preview before production

## Slice 7: saves and the C hash primitive

Introduces persistence and lands the first hard-language commitment from [Craft commitments](../foundation/12-craft-commitments.md).

Create:

- save schema and versioned migration framework in `hub-core`
- `c/fnv1a.c` and its Rust FFI shim
- save integrity check using FNV-1a 64-bit
- golden migration tests

Acceptance:

- FNV-1a output matches published reference vectors
- corrupt saves are rejected with a clean fallback path
- migration from any prior version round-trips through golden fixtures

## Slice 8: WebAssembly Text showcase

Lands the hand-written `xoshiro128**` kernel in WAT and the differential test against the Rust default backend.

Create:

- `asm/xoshiro128_starstar.wat`
- opt-in alternate-backend test that asserts byte-identical output between the Rust and WAT implementations for a published seed across a long stream

Acceptance:

- differential test passes for at least 100 000 outputs
- release gate runs the test; PR gate does not (keeps a broken WAT from blocking routine work)
- WAT file is readable, commented, and a contributor can hold both implementations in mind side by side

This slice is a release blocker for the first public launch.

## Slice 9: `haggis-eval` CLI

Lands the Go orchestration tool.

Create:

- `tools/haggis-eval/` Go binary
- aggregator that runs Rust headless evals, Playwright browser evals, performance-budget checks, and the WAT differential test, and writes both a human report and a machine-readable JSON report

Acceptance:

- single command answers "is this slice good?"
- exits non-zero on any failure
- unit-tested orchestration logic
- referenced from the release gate

This slice can land any time after Slice 7 once at least two eval categories exist.
