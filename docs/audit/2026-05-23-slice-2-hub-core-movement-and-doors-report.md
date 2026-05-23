# 2026-05-23 Slice 2 hub-core movement and doors report

Status: current implementation report
Scope: Slice 2 Rust core movement, bounds, door proximity, and interaction state
Related: [Implementation sequence](../plans/2026-05-22-implementation-sequence.md), [Quality gates](../foundation/07-quality-gates.md), [Testing strategy](../architecture/testing-strategy.md)

## Summary

Slice 2 is complete for the Rust core layer.

The `hub-core` crate now owns deterministic fixed-unit movement and door proximity primitives without adding dependencies. Browser/WASM exposure remains a later slice.

## Files changed

- `crates/hub-core/src/lib.rs`
- `docs/plans/2026-05-22-implementation-sequence.md`
- `docs/README.md`
- `README.md`
- `docs/audit/2026-05-23-slice-2-hub-core-movement-and-doors-report.md`

## Behavior added

- Fixed integer `Position` values for deterministic world coordinates.
- `Aabb` bounds with intersection, non-negative size sanitization, saturating construction, and clamped player-center movement.
- Tick-aligned `InputVector` normalized to `-1`, `0`, or `1` per axis.
- `PlayerState` with center position, sanitized non-negative half extent, and sanitized non-negative per-tick speed.
- `DoorDefinition` for active launch doors and locked/future doors.
- `InteractionResult` for no interaction, launchable door proximity, and locked door proximity.
- `World::tick_player` for one fixed deterministic movement tick with saturating arithmetic.
- `World::interaction_for` for first matching door interaction in door definition order.

## TDD evidence

The first `hub-core` movement/door tests were written before the implementation. The initial run failed because the new core types did not exist yet:

```text
cargo test -p hub-core
error[E0432]: unresolved imports `super::Aabb`, `super::DoorDefinition`, `super::InputVector`, `super::InteractionResult`, `super::Position`, `super::PlayerState`, `super::World`
```

After implementing the minimal core API and hardening constructor/arithmetic edge cases, the narrow gate passed:

```text
cargo test -p hub-core
10 passed; 0 failed
```

## Verification

Final skeleton gate run after implementation and hardening:

```text
cargo fmt --all -- --check
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
RUSTFLAGS="-D warnings" cargo check --workspace --target wasm32-unknown-unknown
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm run build
```

Result: passed.

Additional review verification run by an isolated subagent also passed `git diff --check`, Rust narrow gates, WASM check, TypeScript typecheck, Vitest, and Vite build.

## Open risks / deferred work

- WASM boundary exposure is intentionally deferred to Slice 3.
- TypeScript host lifecycle and input sampling are intentionally deferred to Slice 4.
- Renderer choice and first room remain deferred to Slice 5.
- Door interaction currently returns the first matching door in definition order; if overlapping doors become real content, a priority rule may need to be elevated from implementation detail to content policy.
