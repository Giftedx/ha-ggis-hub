# 2026-05-23 Slice 3 WASM boundary report

Status: current implementation report
Scope: Slice 3 `hub-wasm` exports, TypeScript boundary initialization seam, invalid-input boundary tests, and documentation alignment
Related: [Implementation sequence](../plans/2026-05-22-implementation-sequence.md), [Quality gates](../foundation/07-quality-gates.md), [Runtime boundaries](../architecture/runtime-boundaries.md), [Craft commitments](../foundation/12-craft-commitments.md)

## Summary

Slice 3 is complete for the first Rust/WASM boundary layer.

The `hub-wasm` crate now exposes core identity, a deterministic demo world factory, player tick snapshots, and door interaction snapshots using primitive `wasm-bindgen`-friendly shapes. The TypeScript host now has a typed `src/wasm/boundary.ts` initialization seam that can consume the generated WASM module, normalize generated method names into host-facing camelCase APIs, and fail with a structured initialization error.

No new dependencies were added.

## Files changed

- `crates/hub-wasm/src/lib.rs`
- `src/wasm/boundary.ts`
- `src/wasm/boundary.test.ts`
- `src/app/app.ts`
- `src/app/app.test.ts`
- `docs/plans/2026-05-22-implementation-sequence.md`
- `docs/README.md`
- `README.md`
- `docs/audit/2026-05-23-slice-3-wasm-boundary-report.md`

This report also sits on top of the still-uncommitted Slice 2 files already present in the working tree.

## Behavior added

- `hub_core_project_name()` exposes core identity through WASM.
- `create_demo_world()` exposes the current deterministic hub world through WASM.
- `HubWorld::tick_player(...)` accepts primitive boundary values and returns a `HubPlayerSnapshot`.
- `HubWorld::interaction_for(...)` accepts primitive boundary values and returns a `HubInteractionSnapshot`.
- Invalid boundary inputs are sanitized by the underlying `hub-core` constructors and input normalization: negative sizes/speeds become zero, input axes become `-1`, `0`, or `1`, and arithmetic saturates.
- `initializeHubCore(loadModule)` initializes a generated WASM module behind a typed TypeScript loader seam.
- `HubWasmInitializationError` gives host UI code a specific failure type for future fallback rendering.
- The TypeScript boundary copies primitive values out of generated `wasm-bindgen` snapshot objects and calls `free()` in `finally` blocks, including error paths, so future per-tick use does not leak WASM-owned snapshot allocations.
- The app model phase now states that the executable foundation has a Rust/WASM boundary, without claiming gameplay rendering exists.

## TDD evidence

Rust boundary tests were written before the exports existed. The initial narrow run failed as expected:

```text
cargo test -p hub-wasm
error[E0432]: unresolved imports `super::HubInteractionKind`, `super::HubWorld`, `super::create_demo_world`, `super::hub_core_project_name`
```

TypeScript boundary tests were written before `src/wasm/boundary.ts` existed. The initial narrow run failed as expected:

```text
pnpm exec vitest run src/wasm/boundary.test.ts
Error: Cannot find module './boundary'
```

The app phase test was updated before the model value changed. The initial narrow run failed as expected:

```text
pnpm exec vitest run src/app/app.test.ts
expected phase "executable foundation with Rust/WASM boundary" but received "executable foundation skeleton"
```

After implementation, the narrow gates passed:

```text
cargo test -p hub-wasm
3 passed; 0 failed

pnpm exec vitest run src/app/app.test.ts src/wasm/boundary.test.ts
4 passed; 0 failed
```

## Verification

Slice-local verification run during implementation:

```text
cargo fmt --all
cargo test -p hub-wasm
RUSTFLAGS="-D warnings" cargo check -p hub-wasm --target wasm32-unknown-unknown
pnpm exec tsc --noEmit
pnpm exec vitest run
```

Result: passed.

Review-driven hardening added after the first implementation pass:

- TypeScript generated snapshot interfaces include `free()`.
- `playerSnapshotFromGenerated` and `interactionFromGenerated` call `free()` in `finally` blocks.
- Vitest asserts snapshot cleanup on the normal player/interaction path and on the unexpected interaction-kind error path.

Final full skeleton gate is recorded in the session completion report after review-driven fixes, if any.

## Open risks / deferred work

- The actual generated `wasm-bindgen` JavaScript package is not checked in; the TypeScript boundary deliberately accepts a generated module loader so Vite integration can land cleanly in Slice 4.
- Host lifecycle, route changes, direct-play launch UI, and input sampling remain Slice 4 work.
- Renderer choice and first visible room remain Slice 5 work.
- The demo world currently hard-codes the WHS and future-bothy doors in the WASM crate; a registry mapping is planned for Slice 4.