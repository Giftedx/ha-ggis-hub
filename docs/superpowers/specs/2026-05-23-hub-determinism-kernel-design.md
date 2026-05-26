# Hub-Determinism Kernel — Design Spec

Status: approved design, pre-implementation
Date: 2026-05-23
Scope: first of two sub-projects under the locked technical thesis for ha.ggis Hub
Related:
- [Project charter](../../foundation/00-project-charter.md)
- [Stack decision record](../../foundation/05-stack-decision-record.md)
- [Quality manifesto](../../foundation/11-quality-manifesto.md)
- [Craft commitments](../../foundation/12-craft-commitments.md)
- [Architecture overview](../../architecture/overview.md)
- [Runtime boundaries](../../architecture/runtime-boundaries.md)
- [ADR-0001 Rust/WASM core](../../decisions/0001-rust-wasm-core-typescript-host.md)
- [ADR-0004 Language and craft philosophy](../../decisions/0004-language-and-craft-philosophy.md)
- [ADR-0005 Canvas2D first room](../../decisions/0005-canvas2d-first-room-renderer.md)

## 0. Context and thesis

ha.ggis Hub is a professional-portfolio artifact judged by a generalist senior reviewer. The locked technical thesis is:

> **A deterministic, replayable, agent-evaluable web game hub.**

Every gameplay session is reproducible byte-exact from `(seed, input-log)` in both the browser and a native CI binary. The eval harness can replay any session, assert state, diff against golden snapshots, and gate merges on the result. This thesis makes every hard-language commitment from [Craft commitments](../../foundation/12-craft-commitments.md) load-bearing rather than vanity, and makes the agent autopilot loop tractable because every gate has an unambiguous oracle.

The project is decomposed into two sub-projects, each with its own design / plan / implementation cycle:

1. **Hub-Determinism Kernel** (this spec) — deterministic Rust core, WASM boundary, WAT RNG, C hash, replay engine, Go `haggis-eval` CLI. No new gameplay.
2. **WHS-Stub Slice** (future spec) — a small in-hub demo gameplay slice (e.g. a fixed-seed 30-second first wave) that consumes the kernel and proves the replay thesis end-to-end on real workload. Full Wild Haggis Survivors remains an external link governed by a future ADR.

This spec covers sub-project one. The kernel is the foundation that lets sub-project two ship without fear of drift.

## 1. Architecture

```
+---------------------------------------------------------------+
|  haggis-eval (Go CLI) — single binary, FNV-signed report       |
|  orchestrates every gate below                                |
+---------------------------------------------------------------+
              |                              |
              v                              v
+--------------------------+      +-------------------------------+
|  Native test binary      |      |  Browser host (Playwright)    |
|  cargo nextest +         |      |  records session, persists    |
|  replay::run(seed, log)  |      |  input log + state hashes     |
+--------------------------+      +-------------------------------+
              |                              |
              +---- identical hash ----+----+
                                       v
                          +--------------------------+
                          |  hub-core (Rust)         |
                          |  Sim::tick pure fn       |
                          |  RNG  ┐    Hash  ┐       |
                          |  Rust |    Rust  |       |
                          |  WAT  ┘ diff'd   C  ┘    |
                          +--------------------------+
                                  |        |
                                  v        v
                         asm/*.wat    c/*.c (via FFI)
```

**Single source of truth: `hub-core`.** The WASM module is a boundary, not a parallel implementation. Native tests and browser sessions feed the same core. Replay reproducibility across surfaces is the headline guarantee and the primary gate.

## 2. Components

### 2.1 `hub-core` — deterministic kernel (Rust)

- `Sim` — pure state machine. Signature: `Sim::tick(&mut self, input: InputSnapshot) -> RenderSnapshot`. The `Rng` lives *inside* `Sim`; RNG state advances as part of tick state, not threaded externally. This keeps replay reconstruction simple — `Sim::new(seed)` + a stream of `InputSnapshot`s is the entire replay input set. No `std::time`, no float in gameplay paths, no global state. Every RNG draw is routed through `Sim`'s internal `Rng`.
- `Rng` — xoshiro128**. 16 bytes of state, owned by `Sim`. Internal API only (`Sim` exposes deterministic gameplay results, not raw RNG draws, to the outside). Reference vectors verified in unit tests against a standalone `Rng::seed(...)` constructor.
- `Hash` — FNV-1a 64-bit, pure Rust implementation in `hub-core`. Used as the default at runtime; the C implementation (§2.3) is the second backend for differential testing.
- `InputSnapshot` — packed `u16` carrying movement axes, interact bit, and reserved bits. Tick-aligned. No floats. Bit layout fixed and documented as part of the public boundary.
- `RenderSnapshot` — flat `#[repr(C)]` struct, copyable, no allocations. Lives on Rust stack, copied into a JS-side `Uint32Array` view by the boundary.
- `state_hash(&Sim) -> u64` — canonicalised digest over every gameplay-relevant byte. Used by replay verification and by the input log trailer.

The full top-level entity model (rooms, doors, future enemies/projectiles) lives inside `Sim` and is exposed to JS only through the flat render snapshot. JS has no per-entity round-trips.

### 2.2 `asm/xoshiro128_starstar.wat` — WAT RNG kernel

- Hand-authored. Target ~80–120 lines of WebAssembly Text Format.
- Single exported function `next_u32(state_ptr: i32) -> i32` operating on 16 bytes of linear memory shared with Rust.
- Compiled with `wat2wasm` at build time into a sibling module. Loaded behind an opt-in test feature (`--rng-backend=wat`).
- Not used at runtime. Sole purpose: a differential oracle for the Rust `Rng`. Reader can compare the algorithm twice — once in Rust, once in WAT — and the test proves they agree.

### 2.3 `c/fnv1a.c` — C hash kernel

- ~40 LOC. Public signature `uint64_t fnv1a_64(const uint8_t* data, size_t len)`.
- Compiled twice from one source file: `clang` to a native object linked into the Rust crate via `cc-rs` for native test builds; `clang --target=wasm32-unknown-unknown` to a freestanding wasm object linked into the Rust → wasm pipeline for browser builds. Same `.c`, two targets.
- Not used at runtime as the primary hash. Sole purpose: a differential oracle for the Rust hash.

### 2.4 `hub-wasm` — boundary

The WASM boundary collapses to a small, frame-stable surface, fixing the per-tick allocation problem identified in the prior review. The complete public surface:

**Per-frame hot path (zero allocation):**
- `init(seed: u64) -> handle`
- `tick(handle, input_packed: u32) -> u32` — writes into a preallocated snapshot buffer; returns an error tag (`0` = ok)
- `snapshot_ptr(handle) -> u32`, `snapshot_len(handle) -> u32` — zero-copy view into linear memory
- `state_hash(handle) -> u64`

**Init-only (called once at handle creation, never per frame):**
- `room_definition(handle) -> u32` — writes a JSON-encoded room descriptor (door geometry, titles, world dimensions) into a buffer; returns length. TS reads it once and caches.
- `error_message_ptr(handle) -> u32`, `error_message_len(handle) -> u32` — zero-copy view into the last error string when `tick` returns a non-zero tag.

**Replay surface (called by `haggis-eval determinism`, not by the running host):**
- `log_writer_*` — append-only writer over the input log format of §2.5; flushed into a buffer on demand.
- `replay_run(seed: u64, log_ptr: u32, log_len: u32) -> u64` — runs the replay engine of §2.6 inside WASM and returns the final state hash; used by the in-browser determinism test.

No per-tick allocations. No per-tick string returns. The TS host reads a `Uint32Array` over the snapshot buffer once per frame and decodes it into a TS render struct.

### 2.5 Input log format — `.haggislog`

Binary, append-only, versioned. Layout:

| Section | Field | Type | Notes |
|---|---|---|---|
| Header | magic | `[u8;4]` | `HGLG` |
| Header | format_version | `u16` | starts at 1 |
| Header | core_api_version | `u32` | matches `hub_core::CORE_API_VERSION` at write time |
| Header | seed | `u64` | RNG seed for the session |
| Header | started_at_utc_ms | `u64` | informational; not part of replay verification |
| Header | initial_state_hash | `u64` | `state_hash(&Sim)` immediately after `init(seed)` |
| Body | record | `(u32 tick_index, u32 input_packed)` per entry | omitted when input unchanged from prior frame |
| Trailer | final_state_hash | `u64` | `state_hash(&Sim)` after the last tick |
| Trailer | total_ticks | `u32` | |
| Trailer | log_digest | `u64` | FNV-1a of (header + body + final_state_hash + total_ticks) — covers everything except the digest itself, so tampering with the final hash or tick count is also detected |

Reader/writer implemented in Rust, callable from both native and WASM. TS host writes the log to a `Uint8Array` in memory; Playwright extracts the buffer and hands it to `haggis-eval determinism`.

**Version policy.** `replay::run` rejects any log whose `core_api_version` does not exactly match the running `hub_core::CORE_API_VERSION`. There is no automatic migration. Migration, when it becomes necessary, is its own ADR and lands behind an explicit version-bump in `CORE_API_VERSION` with golden fixtures per version.

### 2.6 Replay engine

- `replay::run(log: &Log) -> Result<ReplayOutcome, ReplayError>`. Reconstructs Sim from header seed, feeds every tick's input (filling unchanged frames from the previous input), hashes final state, compares against the log's trailer hash. Mismatch produces `ReplayError::Divergence { at_tick }`.
- The same `replay::run` is invoked by `haggis-eval determinism`: take a log produced by the browser, replay native, assert digests match. This is the headline guarantee.

### 2.7 `tools/haggis-eval/` — Go orchestrator CLI

Single Go binary, single source tree. Subcommands:

| Command | Gate it runs |
|---|---|
| `haggis-eval rust` | `cargo fmt --check`, `cargo clippy -D warnings`, `cargo nextest run` |
| `haggis-eval ts` | `pnpm tsc --noEmit`, `pnpm vitest run`, `pnpm eslint` |
| `haggis-eval browser` | Playwright smoke + replay capture |
| `haggis-eval determinism` | Replay every captured log natively, diff hashes |
| `haggis-eval differential rng` | Rust vs WAT xoshiro128**, fixed seed, 1M draws |
| `haggis-eval differential hash` | Rust vs C FNV-1a, published vectors + fuzz |
| `haggis-eval perf` | Per-asset bundle budgets + W3C Paint Timing API via chromium-headless against local preview (hand-rolled; `size-limit` and Lighthouse in original spec dropped — both are deps the project doesn't need, the W3C primitives suffice) |
| `haggis-eval a11y` | Hand-rolled WCAG 2.2 AA spot-checks via Playwright (page language, viewport zoom, page title, canvas + interactive accessible names, persistent fallback help, live door status messages, label-in-name, keyboard reachability, focus indicator visibility, computed contrast ratio on every declared text pair). Shipped 2026-05-24 — no axe-core / pa11y dep (deps the project doesn't need at the current a11y surface size) |
| `haggis-eval security` | Live preview response headers diffed against `public/_headers` |
| `haggis-eval slice <name>` | Runs the gate-set declared for `<name>` in `tools/haggis-eval/slices.json` (TOML in original spec; pivoted to JSON because haggis-eval is stdlib-only Go) |
| `haggis-eval all` | Every gate above; exit non-zero on any failure |

Output: a human-readable report on stdout and an FNV-signed tamper-evident JSON report at `target/haggis-eval/<utc>.json`. The signature is a JSON-safe fixed-width FNV-1a 64 hex string over the report payload; `haggis-eval verify-report` detects payload edits that were not re-hashed. This is not cryptographic authenticity.

Implemented in Go because Go's small typed binary that orchestrates processes is exactly the right tool, per [Craft commitments §B-Go](../../foundation/12-craft-commitments.md#go--haggis-eval-cli). It replaces what would otherwise be a tangled shell pipeline or a Python harness whose dependencies are themselves a maintenance burden.

## 3. Data flow — the replay-determinism path

```
Browser session
  -> input log written into linear memory
  -> Playwright extracts .haggislog blob
  -> haggis-eval determinism feeds blob to native replay::run
  -> compares final_state_hash with blob's trailer hash
  -> green: byte-exact reproduction across browser + native
  -> red:   ReplayError::Divergence { at_tick } printed; eval fails
```

Drift modes this catches that the current test suite cannot:

- Float creep into gameplay paths
- Allocator-order dependence
- Browser-vs-native ordering bugs in the boundary
- WAT/Rust RNG drift
- C/Rust hash drift
- Hidden non-determinism from third-party code that may slip in later

## 4. Error handling

- `hub-core` returns `Result` from anything that can fail. No `unwrap()` on a path reachable by a non-test caller.
- The WASM boundary translates errors into a tagged `u32` return code plus a pointer to a zero-copy error message; the TS host throws `HubCoreError { tag, message }`. A window-level error boundary (`error` + `unhandledrejection` listeners) swaps the canvas for the fallback shell containing the direct-play link and runtime status. The existing `try`/`catch` in `src/main.ts` is the seed of this; the kernel slice hardens it into the boundary described here.
- `haggis-eval` always exits with a numeric code matching the failing subcommand category; never swallows a failure; never returns 0 on partial success.
- Replay divergence is a hard failure with `at_tick` for fast bisection.

## 5. Testing strategy

| Layer | Test type | Where it runs |
|---|---|---|
| `hub-core` unit | Rust `#[test]`, fixed seeds, golden vectors | `cargo nextest` |
| `hub-core` property | `proptest` over RNG distribution, hash collisions, Sim idempotence on no-input ticks | `cargo nextest` |
| WAT differential | Rust RNG vs WAT RNG over 1M draws | `haggis-eval differential rng` |
| C differential | Rust hash vs C hash, vectors + 100k fuzz | `haggis-eval differential hash` |
| Boundary | Vitest against a real WASM init — no mocks | `pnpm vitest` |
| Browser smoke | Playwright load + input + capture log | `haggis-eval browser` |
| Replay determinism | Browser-captured log replayed native, hash equal | `haggis-eval determinism` |
| Perf budget | Hand-rolled per-asset bundle byte caps + W3C Paint Timing API medians via chromium-headless (no `size-limit` or Lighthouse dep) | `haggis-eval perf` |
| Accessibility | Hand-rolled WCAG 2.2 AA spot-checks via Playwright; 22 checks across page language, viewport zoom, page title, accessible names, fallback help, live status, label-in-name, keyboard reachability, focus visibility, contrast ratio (no axe-core / pa11y dep) | `haggis-eval a11y` |
| Security headers | Live preview headers vs `public/_headers` | `haggis-eval security` |

**No layer mocks another layer in the gating tests.** Mocks are permitted only in `hub-core` unit tests where the boundary itself is the system-under-test.

## 6. Agent autopilot loop

Per [[autopilot-believer]] and [Autopilot rules](../../foundation/11-quality-manifesto.md#autopilot-rules):

1. Slice spec lives in `docs/superpowers/specs/<date>-<slice>-design.md` — this template.
2. Implementation plan lives in `docs/superpowers/plans/<date>-<slice>-plan.md`, produced by the `writing-plans` skill from the approved spec.
3. The agent works one task at a time from the plan, in a worktree, with a coherent commit per completed task.
4. A slice cannot be marked complete until `haggis-eval slice <name>` is green, the JSON report is committed to `target/haggis-eval/<utc>.json`, and the JSON is pasted into the PR description.
5. After merge, the agent writes a one-line reflection to `~/.claude/memory/reflections.jsonl`.
6. Foundation docs and ADRs are updated in the same PR if the slice changed reality.
7. Gate weakening is the one PR rule that auto-rejects. Suppressing a clippy warning, mocking a differential test, or commenting out an assertion in a gating test all qualify.

## 7. Touchpoints with existing code

The current Canvas2D first-room slice is not discarded. The kernel design lands on top of it. Specific touchpoints:

- The current per-tick `tick_player` WASM boundary is collapsed into the coarser `tick(input_packed)` of §2.4.
- The current `interaction_for` returning owned strings becomes a packed numeric result inside the render snapshot; door titles are resolved in TS from a static table populated once at init.
- The current TS `DEFAULT_HUB_ROOM_DOORS` literal is deleted; doors come from `room_definition()` exposed by `hub-wasm`, single source of truth.
- The current RAF tick-per-frame becomes a fixed-step accumulator. Replay requires it.
- The foundation document set is pruned: the 13 numbered foundation docs collapse to five — **charter, stack, gates, manifesto, craft-commitments** — with the remainder moved to `docs/archive/` carrying explicit supersession notes. ADRs stay where they are. Per-slice audit reports stop being written; the `haggis-eval` FNV-signed tamper-evident JSON report replaces them as the slice-level evidence.

## 8. Out of scope for this sub-project

- WHS stub gameplay — sub-project two, future spec.
- WebGPU renderer — later ADR; Canvas2D stays for the first slice per [ADR-0005](../../decisions/0005-canvas2d-first-room-renderer.md).
- Save schema versioning — later, once there is gameplay state worth saving.
- Multi-room hub layout — later, once one room is perfect.
- Server, accounts, telemetry, leaderboards — explicitly excluded.

## 9. Acceptance criteria

The kernel sub-project is complete when all of the following are true:

1. `hub-core` exposes the `Sim`, `Rng`, `Hash`, `InputSnapshot`, `RenderSnapshot`, `state_hash`, and `replay::run` surfaces described in §2.1 and §2.6, with the test coverage described in §5.
2. `asm/xoshiro128_starstar.wat` and `c/fnv1a.c` exist and pass differential tests against the Rust implementations.
3. `hub-wasm` exposes only the four boundary functions in §2.4; the prior per-entity round-trips are gone.
4. The `.haggislog` reader/writer exists and round-trips on a synthetic log.
5. `tools/haggis-eval/` exists as a single Go binary with every subcommand in §2.7 implemented; `haggis-eval all` passes on a clean checkout.
6. A Playwright session can record a log; `haggis-eval determinism` replays it native; final hashes match.
7. Foundation docs are pruned per §7; archived material moved with supersession notes.
8. The current first-room behaviour still works for the visitor: walk the haggis with WASD/arrows, see door prompts, use the direct-play link. Visible behaviour is unchanged or improved; nothing regresses.

## 10. Non-goals of this spec

- This spec does not pick an implementation order. That is the job of the plan produced by `writing-plans`.
- This spec does not enumerate every test case. It enumerates test *layers* and gate composition; concrete cases land in the plan or the test files.
- This spec does not redesign visible UX. Visible behaviour is preserved or strictly improved; nothing in this kernel sub-project requires a UX redesign.
