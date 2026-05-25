# 12 Craft Commitments

Status: canonical foundation policy
Scope: which primitives this project hand-rolls, where C, WebAssembly Text, and Go legitimately appear, and how dependencies are selected, justified, audited, and removed
Related: [Quality manifesto](11-quality-manifesto.md), [Quality gates](07-quality-gates.md), [ADR-0004](../decisions/0004-language-and-craft-philosophy.md), [Architecture overview](../architecture/overview.md), [Implementation sequence](../plans/2026-05-22-implementation-sequence.md)

## Purpose

The [Quality manifesto](11-quality-manifesto.md) says we hand-roll central primitives when ownership improves quality, performance, control, or portfolio signal. [ADR-0004](../decisions/0004-language-and-craft-philosophy.md) says hard languages must earn their keep. Those are values.

This document is the values translated into **named commitments**. Each entry below is policy. New work must respect it. Any new primitive added to the hand-roll catalogue, or any new use of a non-default language, lands here first (or is rejected here).

The doc has two purposes:

1. Tell a contributor or agent, before they start a slice, exactly what they are expected to hand-roll and what they may not reach for a library for.
2. Make the hard-language showcases real — committed artifacts with measurable shape — instead of aspirational hedges.

## Section A: Hand-rolled primitives catalogue

Every primitive below refuses a specific library or class of library. The hand-rolled version is owned, tested, and small enough to be a single file or tight module.

### Rust core primitives

| Primitive | Refuses | Why hand-roll | API surface (sketch) | Lands in |
|---|---|---|---|---|
| Fixed-timestep loop with capped accumulator | game-engine loops; any "raf-loop" library | gameplay truth must be deterministic, cap-safe across slow devices, and decoupled from the renderer | `Sim::tick(input: InputSnapshot) -> RenderSnapshot`; bounded accumulator advances N ticks per frame within a hard cap | First Perfect Slice |
| Deterministic seedable RNG — xoshiro128\*\* | `rand` crate, getrandom for runtime RNG | deterministic replay, agent eval, well-known algorithm with public reference vectors, fits in 16 bytes of state | `Rng::seed(u64)`, `rng.next_u32()`, `rng.next_bounded(max: u32)` | First Perfect Slice |
| AABB collision + door proximity | any 2D physics crate | only AABB is needed; anything heavier brings lifecycle gravity for nothing | `Aabb::intersects(&Aabb) -> bool`; `proximity(player, door, radius) -> ProximityState` | First Perfect Slice |
| Input buffer (rolling window) | any input-handling crate or DOM helper | one place owning debounce, key remap, hold detection, and tick-aligned sampling | `InputBuffer::sample(raw: RawInput, tick: u32) -> InputSnapshot` | First Perfect Slice |
| Game registry validator | a schema-validation crate (serde-valid, validator, garde) | 5–10 invariants are clearer as explicit code than as derived schema constraints | `validate(&Registry) -> Result<(), ValidationErrors>` | First Perfect Slice |
| Save schema + versioned migration framework | a serde-migration helper crate | few schema versions; explicit `match` over `SaveVersion` is clearer than implicit migration chains | `SaveV1::migrate(prev: SaveAny) -> Result<SaveV1, MigrationError>`; golden fixtures per version | Save-introduction slice (after First Perfect Slice) |

### TypeScript host primitives

| Primitive | Refuses | Why hand-roll | API surface (sketch) | Lands in |
|---|---|---|---|---|
| WASM boundary loader | a generated wrapper as the public API | own the lifecycle, the panic-hook installation, the error pathway, the failure-fallback UI handoff | `loadHubCore(): Promise<HubCore>`; throws structured errors that the fallback UI consumes | First Perfect Slice |
| Tiny route + history primitive | `react-router`, `wouter`, `tinyrouter`, any router library | ~50–100 LOC for the routes the hub actually needs; full control over deep-link/refresh semantics | `createRouter(routes: RouteMap): Router`; `router.go(path)`; `router.subscribe(cb)` | First Perfect Slice |
| Direct-play launcher + reduced-motion gate | any UI helper kit | ~10 LOC of HTML and a `matchMedia` call; load-bearing UX feature, not worth a dep | factory that returns the button DOM and wires the click handler | First Perfect Slice |
| Error boundary + clean-failure fallback UI | a framework-coupled error boundary | must work without React/Vue/Svelte; must keep the direct-play link reachable even when WASM/renderer dies | window-level `error`/`unhandledrejection` handler + fallback DOM template | First Perfect Slice |

### Presentation primitives

| Primitive | Refuses | Why hand-roll | API surface (sketch) | Lands in |
|---|---|---|---|---|
| CSS layout for the bothy | Tailwind, Bootstrap, any UI kit | the bothy is one screen with a handful of elements; handwritten CSS is smaller, faster, and ours; matches the [suckless standard](11-quality-manifesto.md#suckless-standard) | hand-authored `style.css`; CSS custom properties for theme tokens | First Perfect Slice |

### Owner column

Each primitive's owner is either *human*, *agent*, or *either*. The default is *either*, given the [Autopilot rules](11-quality-manifesto.md#autopilot-rules) gates. Exceptions are recorded when the primitive needs taste calibration that agents currently cannot supply:

- *human-led*: CSS layout (visual taste).
- *agent-led acceptable*: everything else above. An agent may produce the first draft; review still gates merge.

## Section B: Hard-language commitments

Each non-default language gets at least one **committed artifact** that has to land for the project to be considered done. Each commitment satisfies [ADR-0004](../decisions/0004-language-and-craft-philosophy.md)'s guardrail: it must improve quality, correctness, control, performance, or professional signal — not just exist.

### C — FNV-1a 64-bit hash

- **Artifact**: `c/fnv1a.c` plus a Rust FFI shim. Compiled with `clang` to a WebAssembly object (or, if profiling shows it's simpler, linked natively from the Rust crate during host builds).
- **Used for**: (a) save-file integrity check — every persisted hub save carries an FNV-1a digest, and load rejects mismatched digests; (b) stable hashes of registry entries for deterministic ordering and cache keys.
- **Size**: ~40 LOC of C.
- **Earns its keep by**: avoiding a Rust hash dependency for a primitive whose properties (non-cryptographic, fast, well-known reference vectors) match exactly what we need, and by demonstrating a small clean C primitive callable from the WASM core.
- **Tests**: assert FNV-1a 64-bit output against published reference vectors (`"" → 0xcbf29ce484222325`, `"foobar" → 0x85944171f73967e8`, etc.); fuzz target for differential testing against a Rust reference implementation.
- **Lands in**: the save-introduction slice. Not required for First Perfect Slice.

### Assembly (WebAssembly Text Format) — xoshiro128\*\* kernel

- **Artifact**: `asm/xoshiro128_starstar.wat`, hand-authored.
- **Role**: an alternate backend for the deterministic RNG. The Rust implementation is the runtime default. The WAT implementation is exercised through an opt-in test gate that asserts **byte-identical output** to the Rust version across a published seed and a long stream.
- **Size**: ~80–120 lines of `.wat`.
- **Earns its keep by**: being a deliberate measured portfolio showcase per [ADR-0004](../decisions/0004-language-and-craft-philosophy.md), and by providing a property-strength differential test that increases confidence in the RNG itself. A reader can compare a few dozen lines of clean WAT against a few dozen lines of clean Rust and see the same algorithm twice.
- **Tests**: differential test (same seed → identical stream); included in the release gate; not on the PR gate (kept opt-in so a broken WAT does not block routine work).
- **Lands in**: after First Perfect Slice ships, before public launch. Public launch is blocked on the differential test passing.

### Go — `haggis-eval` CLI

- **Artifact**: `tools/haggis-eval/`, a single Go binary.
- **Role**: orchestrate the full eval set into one signed report. Runs Rust workspace tests + clippy + fmt, Playwright browser smokes, the determinism + visual + security gates, the hand-rolled perf gate (per-asset bundle budgets via `scripts/perf-budgets.mjs` + W3C Paint Timing API medians via `scripts/run-paint-gate.mjs` — no `size-limit` or Lighthouse npm deps), the hand-rolled a11y gate (22 WCAG 2.2 AA spot-checks via `scripts/run-a11y-gate.mjs` — no axe-core / pa11y dep), and the C-vs-Rust hash + WAT-vs-Rust RNG differential tests. Aggregates results, prints a human report, writes a signed JSON report, exits non-zero on any failure.
- **Size**: ~500–1500 LOC.
- **Earns its keep by**: replacing what would otherwise be a tangled shell pipeline or a Python harness whose dependencies are themselves a maintenance burden. Go's strength — small typed binaries that orchestrate processes — fits exactly. Gives agents a single command that answers "is this slice good?".
- **Tests**: Go unit tests for the orchestration logic; the binary is itself exercised by the release gate.
- **Lands in**: middle phase, when at least two eval categories exist. Not required for First Perfect Slice.

## Section C: Criteria

### When to add a hand-rolled primitive

Add when **all** of:

- the primitive is central to the project's identity, deterministic core, or public UX;
- the hand-rolled version is small enough to own (rule of thumb: <500 LOC for the primitive alone);
- tests can prove behaviour independent of the rest of the system;
- the dependency being refused has at least one of: bundle cost, supply-chain risk, lifecycle gravity, feature surface we will not use, or licence drag.

### When to escalate to a full ADR

Escalate when **any** of:

- the choice meaningfully restricts other choices (e.g. picking the router shape locks in the URL design);
- the hand-rolled primitive has two or more plausible competing designs;
- a contributor or agent flags the choice as load-bearing for explicit review.

### When to remove a primitive entry

Remove when **any** of:

- the dependency we refused has changed and the trade no longer holds;
- the primitive proved more expensive to maintain than the library would have cost;
- a better-tested in-house alternative supersedes it. In that case the superseding primitive replaces this entry; the old one moves to `docs/archive/` with a supersession note.

### When to graduate a hard-language candidate to "decided"

A hard-language entry is "decided" only when **all** of:

- a measurable case (LOC, bundle, perf, signal) is documented here;
- the required tests and benchmarks exist and pass;
- the artifact is referenced from the implementation sequence and the relevant ADR if one is needed.

All three current hard-language entries (C, Assembly, Go) are decided. Future candidates start as "proposed" rows in Section B and are promoted (or rejected) by amending this doc.

## Section D: Cross-doc updates required when this doc changes

When you add, remove, or change an entry above, update each of these that applies:

- [Dependency policy](#dependency-policy) — if a refused dependency moves classes, or if a new toolchain (e.g. `clang`, Go) needs to be sanctioned.
- [Implementation sequence](../plans/2026-05-22-implementation-sequence.md) — if the change shifts what lands in which slice.
- [Architecture overview](../architecture/overview.md) — if the new primitive needs a place in the top-level layout.
- [ADR-0004](../decisions/0004-language-and-craft-philosophy.md) — if a new hard-language commitment is added, or if a hard-language entry is removed.
- The [Quality manifesto](11-quality-manifesto.md) — only if the underlying value has changed (rare).
- The [Glossary](../glossary.md) — if a new term is introduced.

If a hand-roll commitment is broken (e.g. the project adopts a router library), an ADR is required. The dependency policy alone is not sufficient cover.

## Dependency policy

### Principle

Every dependency is a liability until proven valuable.

Dependencies add bundle size, supply-chain risk, license obligations, maintenance burden, security exposure, and architectural gravity. Convenience is not enough.

### Dependency classes

#### Allowed by foundation decision

These are accepted as part of the planned foundation, subject to normal version/license/security checks:

- Rust toolchain and Cargo workspace
- wasm-bindgen / wasm-pack for WASM boundary
- TypeScript
- Vite
- pnpm
- Vitest
- Playwright
- proptest for Rust property tests
- cargo-audit / cargo-deny / cargo-nextest / cargo-llvm-cov for quality gates
- `clang` toolchain — for compiling the C primitives committed in [Craft commitments](#section-b-hard-language-commitments) (currently the FNV-1a hash) to WebAssembly
- Go toolchain — for building the `haggis-eval` CLI committed in [Craft commitments](#section-b-hard-language-commitments)

#### Requires ADR or dependency rationale

- renderer dependency such as PixiJS
- any UI framework
- any game engine such as Phaser or Bevy
- analytics/error tracking SDKs
- external asset pipeline tools
- routing frameworks
- state-management libraries

#### Suspicious by default

- broad utility libraries for tiny helpers
- unmaintained packages
- packages with unclear licenses
- packages that force weak CSP
- packages with large transitive dependency trees
- packages that duplicate native platform features

### Required rationale for new dependencies

When adding a dependency, document:

- name and version range
- purpose
- why hand-rolling is worse
- bundle/runtime impact if frontend
- license
- maintenance signal
- security considerations
- removal/replacement plan if it disappoints

Use `docs/decisions/` for architectural dependencies and the relevant implementation plan for small tooling dependencies.

### Lockfiles

Lockfiles are mandatory:

- frontend: `pnpm-lock.yaml`
- Rust: `Cargo.lock` should be committed for this application repo

CI must use frozen/locked installs.

### License posture

Default acceptable licenses:

- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC
- Zlib

Licenses requiring review:

- MPL-2.0
- LGPL
- GPL
- AGPL
- unknown/custom licenses

### Removal policy

Dependencies that are unused, replaceable by simple local code, or responsible for recurring problems should be removed. Dependency cleanup is quality work, not churn.

## Non-goals

- This doc does not catalogue every file the project will ever produce. It catalogues the primitives we *commit* to hand-rolling and the artifacts we *commit* to writing in a hard language.
- This doc does not duplicate the [Dependency policy](#dependency-policy). It is the positive-space counterpart: the things we are not going to reach for a library for.
- This doc does not pick the renderer; that remains [ADR-0002](../decisions/0002-renderer-evaluation-plan.md)'s job. If a custom renderer is chosen later, it joins Section A.
