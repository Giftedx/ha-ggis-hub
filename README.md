# ha.ggis Hub

`ha.ggis Hub` is the planned playable front door for haggis-themed games at `https://ha.ggis.xyz`.

The name is the joke and the product promise:

```text
ha + ggis = haggis
ha.ggis.xyz = say it without the dot
```

This repository has moved from documentation-only foundation into executable foundation work. The current scaffold is intentionally small: a Rust workspace with `hub-core` and `hub-wasm`, plus a strict TypeScript/Vite browser host. `hub-core` now owns deterministic fixed-unit movement and door proximity primitives, `hub-wasm` exposes the first typed boundary consumed by the browser build, and the TypeScript host owns lifecycle, input, registry, direct-play launch seams, and a hand-rolled Canvas2D first-room renderer. Browser smoke infrastructure, deployment config, and WHS mounting remain planned future slices.

## Start here

Begin with the [Documentation index](docs/README.md). It catalogues every doc and gives the full recommended reading order.

If you only have time for the load-bearing four, read these in order:

1. [Quality manifesto](docs/foundation/11-quality-manifesto.md) — why this project exists and what it refuses to be
2. [Project charter](docs/foundation/00-project-charter.md) — identity, non-negotiables, WHS boundary
3. [Stack decision record](docs/foundation/05-stack-decision-record.md) — Rust/WASM core + TypeScript host
4. [First Perfect Slice](docs/foundation/10-first-perfect-slice.md) — scope of the first public release

[`AGENTS.md`](AGENTS.md) is the entry point for autonomous agents. [`CONTRIBUTING.md`](CONTRIBUTING.md) is the entry point for humans contributing changes. [`SECURITY.md`](SECURITY.md) covers vulnerability reporting.

## Current state

- Product: planned playable haggis game hub.
- Public domain shape: `ggis.xyz` redirects to `ha.ggis.xyz`.
- First linked game: Wild Haggis Survivors.
- Implementation status: executable foundation skeleton plus Rust core movement/door primitives, a typed WASM boundary consumed by the browser build, TypeScript host lifecycle/input/registry/direct-play seams, and a Canvas2D first-room renderer exist.
- Current executable stack: Rust workspace (`hub-core`, `hub-wasm`) + TypeScript/Vite host.
- Canonical stack direction: Rust/WASM core + TypeScript/Vite host + replaceable renderer.
- Renderer for the first slice: Canvas2D, selected by [ADR-0005](docs/decisions/0005-canvas2d-first-room-renderer.md).

## Non-negotiable standard

Small scope is allowed. Weak foundations are not.

The first public release is a **First Perfect Slice**, not an MVP. It should be small enough to finish and strict enough to prove the final quality bar: deterministic core logic where useful, clear runtime boundaries, strict tests, secure deployment, documented decisions, and no dependency soup.

## Repository documentation map

- `docs/foundation/` — canonical project foundation and policies (numbered).
- `docs/architecture/` — planned runtime architecture, boundaries, testing, security, observability.
- `docs/decisions/` — architecture decision records (ADRs).
- `docs/plans/` — implementation plans and execution sequences.
- `docs/deployment/` — deployment and hosting documentation.
- `docs/research/` — external research notes and uncertainty logs.
- `docs/audit/` — documentation audits and drift reports.
- `docs/archive/` — superseded plans kept as provenance.
- `.hermes/` — tooling state from external planning tools, not canonical content.

## Current executable gates

The current skeleton supports these gates:

```bash
cargo fmt --all -- --check
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
RUSTFLAGS="-D warnings" cargo check --workspace --target wasm32-unknown-unknown
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm run build
```

A Go-built orchestrator CLI bundles every gate above into one command with a signed JSON report. See [`tools/haggis-eval/README.md`](tools/haggis-eval/README.md).

## Before writing implementation code

Future contributors and agents must read:

- [Agent operating mode](docs/foundation/08-agent-operating-mode.md)
- [Stack decision record](docs/foundation/05-stack-decision-record.md)
- [Quality gates](docs/foundation/07-quality-gates.md)
- [First Perfect Slice](docs/foundation/10-first-perfect-slice.md)

Do not scaffold from the archived original plan. It is preserved only as historical input.
